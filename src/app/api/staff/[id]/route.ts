// src/app/api/staff/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

// ─── GET /api/staff/[id] ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { staffProfile: true },
    });

    if (!user || user.role === Role.PATIENT) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const { password: _pw, ...safeUser } = user;
    void _pw;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("[GET /api/staff/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/staff/[id] ──────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      department,
      qualification,
      licenseNumber,
      isActive,
    } = body;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user || user.role === Role.PATIENT) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        isActive: isActive ?? user.isActive,
        staffProfile: {
          update: {
            firstName,
            lastName,
            phone,
            department,
            qualification,
            licenseNumber,
          },
        },
      },
      include: { staffProfile: true },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.UPDATE,
      resource: "User",
      resourceId: params.id,
      description: `Updated staff profile for ${firstName} ${lastName}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    const { password: _pw, ...safeUser } = updated;
    void _pw;

    return NextResponse.json({
      message: "Staff updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("[PUT /api/staff/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/staff/[id] — Deactivate only ────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { staffProfile: true },
    });

    if (!user || user.role === Role.PATIENT) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    const name = user.staffProfile
      ? `${user.staffProfile.firstName} ${user.staffProfile.lastName}`
      : user.email;

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DELETE,
      resource: "User",
      resourceId: params.id,
      description: `Deactivated staff account: ${name}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ message: "Staff account deactivated" });
  } catch (error) {
    console.error("[DELETE /api/staff/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
