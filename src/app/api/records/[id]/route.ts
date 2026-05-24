//src/app/api/records/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { updateRecordSchema } from "@/schemas/record.schema";
import { AuditAction, RecordType, Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/records/[id] ────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    const record = await prisma.medicalRecord.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            userId: true,
          },
        },
        createdBy: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
        vitalSigns: { orderBy: { recordedAt: "desc" } },
        prescriptions: {
          include: {
            prescribedBy: {
              select: {
                staffProfile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        documents: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Patient access check
    if (role === Role.PATIENT) {
      if (record.patient.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (
      !hasPermission(role, "create_medical_record") &&
      !hasPermission(role, "create_nursing_note")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Decrypt sensitive fields
    const decryptedRecord = {
      ...record,
      diagnosis: record.diagnosis ? decrypt(record.diagnosis) : null,
      treatment: record.treatment ? decrypt(record.treatment) : null,
      notes: record.notes ? decrypt(record.notes) : null,
      prescriptions: record.prescriptions.map((p) => ({
        ...p,
        instructions: p.instructions ? decrypt(p.instructions) : null,
      })),
    };

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "MedicalRecord",
      resourceId: record.id,
      description: `Viewed record ${record.recordNumber}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ record: decryptedRecord });
  } catch (error) {
    console.error("[GET /api/records/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/records/[id] ────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "edit_medical_record")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateRecordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const existing = await prisma.medicalRecord.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const updated = await prisma.medicalRecord.update({
      where: { id: params.id },
      data: {
        ...(data.recordType && { recordType: data.recordType as RecordType }),
        ...(data.title && { title: data.title }),
        ...(data.diagnosis !== undefined && {
          diagnosis: data.diagnosis ? encrypt(data.diagnosis) : null,
        }),
        ...(data.treatment !== undefined && {
          treatment: data.treatment ? encrypt(data.treatment) : null,
        }),
        ...(data.notes !== undefined && {
          notes: data.notes ? encrypt(data.notes) : null,
        }),
        ...(data.icdCode !== undefined && { icdCode: data.icdCode }),
        ...(data.isConfidential !== undefined && {
          isConfidential: data.isConfidential,
        }),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.UPDATE,
      resource: "MedicalRecord",
      resourceId: params.id,
      description: `Updated record ${updated.recordNumber}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      message: "Record updated successfully",
      record: {
        ...updated,
        diagnosis:
          data.diagnosis ??
          (updated.diagnosis ? decrypt(updated.diagnosis) : null),
        treatment:
          data.treatment ??
          (updated.treatment ? decrypt(updated.treatment) : null),
        notes: data.notes ?? (updated.notes ? decrypt(updated.notes) : null),
      },
    });
  } catch (error) {
    console.error("[PUT /api/records/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/records/[id] — Admin only ────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "delete_medical_record")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const record = await prisma.medicalRecord.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await prisma.medicalRecord.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETE,
      resource: "MedicalRecord",
      resourceId: params.id,
      description: `Deleted record ${record.recordNumber}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/records/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
