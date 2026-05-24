// src/app/api/auth/verify-email/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { z } from "zod";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// FIX: Validate token with Zod instead of raw body access
const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, "Verification token is required")
    .max(128, "Invalid token"),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 per 15 minutes
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.AUTH);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const body = await request.json();

    // FIX: Zod validation on token
    const validation = verifyEmailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 },
      );
    }

    const { token } = validation.data;

    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid verification link" },
        { status: 400 },
      );
    }

    if (verification.usedAt) {
      return NextResponse.json(
        { error: "This verification link has already been used" },
        { status: 400 },
      );
    }

    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error:
            "This verification link has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: verification.userId,
      action: AuditAction.EMAIL_VERIFIED,
      resource: "User",
      resourceId: verification.userId,
      description: "Email address successfully verified",
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("[POST /api/auth/verify-email]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}