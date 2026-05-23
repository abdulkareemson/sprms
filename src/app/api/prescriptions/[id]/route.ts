// src/app/api/prescriptions/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { dispensePrescriptionSchema } from "@/schemas/prescription.schema";
import { AuditAction, Role } from "@prisma/client";

// ── GET /api/prescriptions/[id] ───────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    if (!hasPermission(role, "view_prescriptions")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prescription = await prisma.prescription.findUnique({
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
            userId: true,
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
                department: true,
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
            createdAt: true,
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Patients can only view their own prescriptions
    if (role === Role.PATIENT) {
      const patient = await prisma.patient.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!patient || prescription.patientId !== patient.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "Prescription",
      resourceId: prescription.id,
      description: `Viewed prescription ${prescription.id} for patient ${prescription.patient.firstName} ${prescription.patient.lastName}`,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({
      prescription: {
        ...prescription,
        instructions: prescription.instructions
          ? decrypt(prescription.instructions)
          : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/prescriptions/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PATCH /api/prescriptions/[id] — Dispense update ──────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    if (!hasPermission(role, "dispense_medication")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = dispensePrescriptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 },
      );
    }

    const { dispenseStatus, dispensingNotes } = result.data;

    const existing = await prisma.prescription.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        dispenseStatus: true,
        medicationName: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Cannot re-dispense an already fully dispensed prescription
    if (existing.dispenseStatus === "DISPENSED") {
      return NextResponse.json(
        { error: "This prescription has already been fully dispensed" },
        { status: 400 },
      );
    }

    const updated = await prisma.prescription.update({
      where: { id: params.id },
      data: {
        dispenseStatus,
        dispensingNotes: dispensingNotes ?? null,
        dispensedAt: dispenseStatus === "DISPENSED" ? new Date() : null,
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
              select: { firstName: true, lastName: true, specialization: true },
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
      action: AuditAction.UPDATE,
      resource: "Prescription",
      resourceId: params.id,
      description: `Prescription ${existing.medicationName} for ${existing.patient.firstName} ${existing.patient.lastName} marked as ${dispenseStatus}`,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({
      message: "Prescription updated successfully",
      prescription: {
        ...updated,
        instructions: updated.instructions
          ? decrypt(updated.instructions)
          : null,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/prescriptions/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/prescriptions/[id] — Doctor/Admin only ───────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    // Only doctors (own prescriptions) and admins can delete
    if (role !== Role.ADMIN && role !== Role.DOCTOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.prescription.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        prescribedById: true,
        dispenseStatus: true,
        medicationName: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Doctors can only delete their own prescriptions
    if (role === Role.DOCTOR && existing.prescribedById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot delete already dispensed prescriptions
    if (existing.dispenseStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot delete a prescription that has been dispensed" },
        { status: 400 },
      );
    }

    await prisma.prescription.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETE,
      resource: "Prescription",
      resourceId: params.id,
      description: `Prescription ${existing.medicationName} for ${existing.patient.firstName} ${existing.patient.lastName} deleted`,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({ message: "Prescription deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/prescriptions/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
