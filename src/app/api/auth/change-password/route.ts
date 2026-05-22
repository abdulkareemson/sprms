//src/app/api/auth/change-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/schemas/auth.schema";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.PASSWORD_RESET,
      resource: "User",
      resourceId: session.user.id,
      description: "Password changed successfully",
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("[POST /api/auth/change-password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
