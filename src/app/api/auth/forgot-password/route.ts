//src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/schemas/auth.schema";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    const { email } = validation.data;

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { staffProfile: true },
    });

    if (!user) return successResponse;
    if (!user.isActive) return successResponse;

    // Invalidate existing tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Send email
    const name = user.staffProfile
      ? `${user.staffProfile.firstName} ${user.staffProfile.lastName}`
      : email.split("@")[0];

    await sendPasswordResetEmail(email, name, token);

    await createAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET,
      resource: "User",
      resourceId: user.id,
      description: "Password reset email requested",
      ipAddress: getIpAddress(request),
    });

    return successResponse;
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
