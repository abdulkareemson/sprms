// src/app/api/prescriptions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  createPrescriptionSchema,
  prescriptionQuerySchema,
} from "@/schemas/prescription.schema";
import { AuditAction, Role } from "@prisma/client";

// ── GET /api/prescriptions ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    if (!hasPermission(role, "view_prescriptions")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queryResult = prescriptionQuerySchema.safeParse({
      patientId: searchParams.get("patientId") ?? undefined,
      recordId: searchParams.get("recordId") ?? undefined,
      dispenseStatus: searchParams.get("dispenseStatus") ?? undefined,
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { patientId, recordId, dispenseStatus, page, limit } =
      queryResult.data;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Patients only see their own prescriptions
    if (role === Role.PATIENT) {
      const patient = await prisma.patient.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!patient) {
        return NextResponse.json({ prescriptions: [], total: 0, page, limit });
      }
      where.patientId = patient.id;
    } else {
      if (patientId) where.patientId = patientId;
      if (recordId) where.recordId = recordId;
    }

    if (dispenseStatus) where.dispenseStatus = dispenseStatus;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
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
              phone: true,
            },
          },
          prescribedBy: {
            select: {
              id: true,
              email: true,
              staffProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  specialization: true,
                },
              },
            },
          },
          medicalRecord: {
            select: {
              id: true,
              recordNumber: true,
              title: true,
              recordType: true,
            },
          },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    // Decrypt instructions
    const decrypted = prescriptions.map((p) => ({
      ...p,
      instructions: p.instructions ? decrypt(p.instructions) : null,
    }));

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "Prescription",
      description: `Viewed prescriptions list${patientId ? ` for patient ${patientId}` : ""}`,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({ prescriptions: decrypted, total, page, limit });
  } catch (error) {
    console.error("[GET /api/prescriptions]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── POST /api/prescriptions ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    if (!hasPermission(role, "write_prescription")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createPrescriptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 },
      );
    }

    const {
      patientId,
      recordId,
      medicationName,
      dosage,
      frequency,
      duration,
      route,
      instructions,
    } = result.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Verify medical record exists and belongs to patient (if provided)
    if (recordId) {
      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        select: { id: true, patientId: true },
      });
      if (!record || record.patientId !== patientId) {
        return NextResponse.json(
          {
            error:
              "Medical record not found or does not belong to this patient",
          },
          { status: 404 },
        );
      }
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        recordId: recordId ?? null,
        prescribedById: session.user.id,
        medicationName,
        dosage,
        frequency,
        duration,
        route,
        instructions: instructions ? encrypt(instructions) : null,
        dispenseStatus: "PENDING",
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        prescribedBy: {
          select: {
            id: true,
            email: true,
            staffProfile: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
          },
        },
        medicalRecord: {
          select: {
            id: true,
            recordNumber: true,
            title: true,
            recordType: true,
          },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE,
      resource: "Prescription",
      resourceId: prescription.id,
      description: `Prescription written for ${patient.firstName} ${patient.lastName}: ${medicationName} ${dosage}`,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json(
      {
        message: "Prescription created successfully",
        prescription: {
          ...prescription,
          instructions: instructions ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/prescriptions]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
