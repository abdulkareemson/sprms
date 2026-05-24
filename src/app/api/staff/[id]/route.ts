// src/app/api/staff/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";
import { z } from "zod";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// FIX: Zod schema for staff update body
const updateStaffSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().max(20).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  qualification: z.string().max(200).optional().nullable(),
  licenseNumber: z.string().max(100).optional().nullable(),
  specialization: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/staff/[id] ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

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
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // FIX: Validate request body with Zod
    const body = await request.json();
    const validation = updateStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user || user.role === Role.PATIENT) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        staffProfile: {
          update: {
            ...(data.firstName && { firstName: data.firstName }),
            ...(data.lastName && { lastName: data.lastName }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.department !== undefined && {
              department: data.department,
            }),
            ...(data.qualification !== undefined && {
              qualification: data.qualification,
            }),
            ...(data.licenseNumber !== undefined && {
              licenseNumber: data.licenseNumber,
            }),
            ...(data.specialization !== undefined && {
              specialization: data.specialization,
            }),
          },
        },
      },
      include: { staffProfile: true },
    });

    const name = updated.staffProfile
      ? `${updated.staffProfile.firstName} ${updated.staffProfile.lastName}`
      : updated.email;

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.UPDATE,
      resource: "User",
      resourceId: params.id,
      description: `Updated staff profile for ${name}`,
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

// ─── DELETE /api/staff/[id] ───────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

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