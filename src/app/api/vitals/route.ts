//src/app/api/vitals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createVitalSignSchema } from "@/schemas/record.schema";
import { AuditAction, Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "record_vitals")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createVitalSignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Calculate BMI if weight and height provided
    let bmi: number | null = null;
    if (data.weight && data.height) {
      const heightInMeters = data.height / 100;
      bmi =
        Math.round((data.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    const vitals = await prisma.vitalSign.create({
      data: {
        patientId: data.patientId,
        recordId: data.recordId ?? null,
        temperature: data.temperature ?? null,
        systolicBP: data.systolicBP ?? null,
        diastolicBP: data.diastolicBP ?? null,
        heartRate: data.heartRate ?? null,
        respiratoryRate: data.respiratoryRate ?? null,
        oxygenSaturation: data.oxygenSaturation ?? null,
        weight: data.weight ?? null,
        height: data.height ?? null,
        bmi,
        notes: data.notes ?? null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE,
      resource: "VitalSign",
      resourceId: vitals.id,
      description: `Recorded vitals for ${patient.firstName} ${patient.lastName} (${patient.patientNumber})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      { message: "Vitals recorded successfully", vitals },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/vitals]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── GET /api/vitals?patientId=xxx ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    const role = session.user.role as Role;

    // Patients can only view their own
    if (role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId: session.user.id },
      });
      if (!patient || patient.id !== patientId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (
      !hasPermission(role, "record_vitals") &&
      !hasPermission(role, "view_all_patients")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const vitals = await prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ vitals });
  } catch (error) {
    console.error("[GET /api/vitals]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
