// src/app/api/patients/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { updatePatientSchema } from "@/schemas/patient.schema";
import { AuditAction, BloodGroup, Gender, Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/patients/[id] ───────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const { id } = await params;

    // Patients can only view their own record
    if (role === Role.PATIENT) {
      const ownPatient = await prisma.patient.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!ownPatient || ownPatient.id !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!hasPermission(role, "view_all_patients")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        medicalRecords: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            recordNumber: true,
            recordType: true,
            title: true,
            createdAt: true,
            createdBy: {
              select: {
                staffProfile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        appointments: {
          where: {
            status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: "asc" },
          take: 3,
          include: {
            doctor: {
              select: {
                staffProfile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            medicalRecords: true,
            appointments: true,
            prescriptions: true,
            invoices: true,
            documents: true,
          },
        },
      },
    });

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "Patient",
      resourceId: patient.id,
      description: `Viewed patient profile: ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("[GET /api/patients/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/patients/[id] ───────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "edit_patient")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, isActive: true, firstName: true, lastName: true },
    });

    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updatePatientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check email uniqueness if email is being changed
    if (data.email) {
      const emailConflict = await prisma.patient.findFirst({
        where: {
          email: data.email,
          isActive: true,
          id: { not: id },
        },
      });
      if (emailConflict) {
        return NextResponse.json(
          { error: "Another patient with this email already exists" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.dateOfBirth && {
          dateOfBirth: new Date(data.dateOfBirth),
        }),
        ...(data.gender && { gender: data.gender as Gender }),
        ...(data.bloodGroup && {
          bloodGroup: data.bloodGroup as BloodGroup,
        }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && {
          email: data.email || null,
        }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.nationality && { nationality: data.nationality }),
        ...(data.emergencyName !== undefined && {
          emergencyName: data.emergencyName,
        }),
        ...(data.emergencyPhone !== undefined && {
          emergencyPhone: data.emergencyPhone,
        }),
        ...(data.emergencyRelation !== undefined && {
          emergencyRelation: data.emergencyRelation,
        }),
        ...(data.insuranceProvider !== undefined && {
          insuranceProvider: data.insuranceProvider,
        }),
        ...(data.insuranceNumber !== undefined && {
          insuranceNumber: data.insuranceNumber,
        }),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.UPDATE,
      resource: "Patient",
      resourceId: id,
      description: `Updated patient: ${updated.firstName} ${updated.lastName} (${updated.patientNumber})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      message: "Patient updated successfully",
      patient: updated,
    });
  } catch (error) {
    console.error("[PUT /api/patients/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/patients/[id] — Soft delete, Admin only ─────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Rate limit
    const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
    if (!rl.success) return rateLimitResponse(rl);

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "delete_patient")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        firstName: true,
        lastName: true,
        patientNumber: true,
      },
    });

    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Soft delete — preserve data integrity
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETE,
      resource: "Patient",
      resourceId: id,
      description: `Deactivated patient: ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ message: "Patient deactivated successfully" });
  } catch (error) {
    console.error("[DELETE /api/patients/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
