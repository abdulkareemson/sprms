// src/app/api/records/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { createRecordSchema } from "@/schemas/record.schema";
import { AuditAction, RecordType, Role } from "@prisma/client";
import { generateRecordNumber } from "@/lib/utils/generate-id";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/records ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const recordType = searchParams.get("recordType");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    // Patients can only view their own records
    if (role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId: session.user.id },
      });

      if (!patient) {
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 },
        );
      }

      if (patientId && patientId !== patient.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const where = {
        patientId: patient.id,
        ...(recordType && { recordType: recordType as RecordType }),
      };

      const [records, total] = await Promise.all([
        prisma.medicalRecord.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                staffProfile: { select: { firstName: true, lastName: true } },
              },
            },
            vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
            _count: { select: { prescriptions: true, documents: true } },
          },
        }),
        prisma.medicalRecord.count({ where }),
      ]);

      const decryptedRecords = records.map((r) => ({
        ...r,
        diagnosis: r.diagnosis ? decrypt(r.diagnosis) : null,
        treatment: r.treatment ? decrypt(r.treatment) : null,
        notes: r.notes ? decrypt(r.notes) : null,
      }));

      return NextResponse.json({
        records: decryptedRecords,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Nurses must provide a patientId
    if (role === Role.NURSE && !patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    if (
      !hasPermission(role, "create_medical_record") &&
      !hasPermission(role, "create_nursing_note") &&
      !hasPermission(role, "view_all_patients")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = {
      ...(patientId && { patientId }),
      ...(recordType && { recordType: recordType as RecordType }),
      ...(role === Role.NURSE && {
        recordType: { in: [RecordType.NURSING_NOTE, RecordType.VACCINATION] },
      }),
    };

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
          vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
          _count: { select: { prescriptions: true, documents: true } },
        },
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    const decryptedRecords = records.map((r) => ({
      ...r,
      diagnosis: r.diagnosis ? decrypt(r.diagnosis) : null,
      treatment: r.treatment ? decrypt(r.treatment) : null,
      notes: r.notes ? decrypt(r.notes) : null,
    }));

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "MedicalRecord",
      description: `Viewed records list${patientId ? ` for patient ${patientId}` : ""}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      records: decryptedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/records]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/records ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const body = await request.json();
    const validation = createRecordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Nurses can only create nursing notes and vaccinations
    if (role === Role.NURSE) {
      if (!hasPermission(role, "create_nursing_note")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        data.recordType !== "NURSING_NOTE" &&
        data.recordType !== "VACCINATION"
      ) {
        return NextResponse.json(
          {
            error:
              "Nurses can only create nursing notes and vaccination records",
          },
          { status: 403 },
        );
      }
    } else if (!hasPermission(role, "create_medical_record")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const recordNumber = await generateRecordNumber();

    const record = await prisma.medicalRecord.create({
      data: {
        recordNumber,
        patientId: data.patientId,
        createdById: session.user.id,
        recordType: data.recordType as RecordType,
        title: data.title,
        diagnosis: data.diagnosis ? encrypt(data.diagnosis) : null,
        treatment: data.treatment ? encrypt(data.treatment) : null,
        notes: data.notes ? encrypt(data.notes) : null,
        icdCode: data.icdCode,
        isConfidential: data.isConfidential ?? false,
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientNumber: true },
        },
        createdBy: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE,
      resource: "MedicalRecord",
      resourceId: record.id,
      description: `Created ${data.recordType} record (${recordNumber}) for ${patient.firstName} ${patient.lastName}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        message: "Medical record created successfully",
        record: {
          ...record,
          diagnosis: data.diagnosis ?? null,
          treatment: data.treatment ?? null,
          notes: data.notes ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/records]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
