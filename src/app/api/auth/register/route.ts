//src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerPatientSchema } from "@/schemas/auth.schema";
import { sendEmailVerificationEmail } from "@/lib/email";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { AuditAction, Gender, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
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

    // Check if email exists
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

    // Generate patient number
    const year = new Date().getFullYear();
    const count = await prisma.patient.count();
    const patientNumber = `PAT-${year}-${String(count + 1).padStart(4, "0")}`;

    // Create user and patient in transaction
    const { user, patient } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: Role.PATIENT,
          isActive: true,
          isEmailVerified: false,
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

      return { user, patient };
    });

    // Create email verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Send verification email
    await sendEmailVerificationEmail(
      data.email,
      `${data.firstName} ${data.lastName}`,
      token,
    );

    await createAuditLog({
      userId: user.id,
      action: AuditAction.CREATE,
      resource: "Patient",
      resourceId: patient.id,
      description: `Patient self-registered: ${data.firstName} ${data.lastName}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json(
      {
        message:
          "Account created successfully. Please check your email to verify your account.",
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
