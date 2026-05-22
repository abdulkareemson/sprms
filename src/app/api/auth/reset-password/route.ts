//src/app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/schemas/auth.schema";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Find valid token
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    if (resetRecord.usedAt) {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: resetRecord.userId,
      action: AuditAction.PASSWORD_RESET,
      resource: "User",
      resourceId: resetRecord.userId,
      description: "Password successfully reset via email token",
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("[POST /api/auth/reset-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}