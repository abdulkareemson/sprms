// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerPatientSchema } from "@/schemas/auth.schema";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { AuditAction, Gender, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { generatePatientNumber } from "@/lib/utils/generate-id";

export async function POST(request: NextRequest) {
  // Rate limit: 10 registrations per hour per IP
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.REGISTER);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const body = await request.json();
    const validation = registerPatientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // FIX: Use generatePatientNumber() — atomic, no race condition
    const patientNumber = await generatePatientNumber();

    const { userId, patient } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: Role.PATIENT,
          isActive: true,
          mustChangePassword: false,
        },
      });

      const patient = await tx.patient.create({
        data: {
          patientNumber,
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender as Gender,
          email: data.email,
          phone: data.phone,
        },
      });

      return { userId: user.id, patient };
    });

    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      resource: "Patient",
      resourceId: patient.id,
      description: `Patient self-registered: ${data.firstName} ${data.lastName} (${patientNumber})`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json(
      {
        message: "Account created successfully. You can now log in.",
        patientNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
