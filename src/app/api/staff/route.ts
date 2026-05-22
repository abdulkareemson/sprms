// src/app/api/staff/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createStaffSchema } from "@/schemas/auth.schema";
import { AuditAction, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendStaffWelcomeEmail } from "@/lib/email";

// ─── GET /api/staff — List all staff ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";

    const staff = await prisma.user.findMany({
      where: {
        role: { not: Role.PATIENT },
        ...(role && { role: role as Role }),
        ...(search && {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            {
              staffProfile: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          ],
        }),
      },
      include: { staffProfile: true },
      orderBy: { createdAt: "desc" },
    });

    // Remove passwords from response
    const safeStaff = staff.map(({ password: _pw, ...rest }) => {
      void _pw;
      return rest;
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "Staff",
      description: "Viewed staff list",
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ staff: safeStaff });
  } catch (error) {
    console.error("[GET /api/staff]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/staff — Create staff account ───────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "create_staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create user + staff profile
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: data.role as Role,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
        staffProfile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            department: data.department,
            qualification: data.qualification,
            licenseNumber: data.licenseNumber,
          },
        },
      },
      include: { staffProfile: true },
    });

    // Send welcome email
    await sendStaffWelcomeEmail(
      data.email,
      `${data.firstName} ${data.lastName}`,
      data.role,
      temporaryPassword,
    );

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE,
      resource: "User",
      resourceId: newUser.id,
      description: `Created staff account for ${data.firstName} ${data.lastName} (${data.role})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    const { password: _pw, ...safeUser } = newUser;
    void _pw;

    return NextResponse.json(
      { message: "Staff account created successfully", user: safeUser },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/staff]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "@#$%&!";

  const getRandom = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)];

  const password = [
    getRandom(upper),
    getRandom(upper),
    getRandom(lower),
    getRandom(lower),
    getRandom(digits),
    getRandom(digits),
    getRandom(special),
    getRandom(special),
  ];

  return password.sort(() => Math.random() - 0.5).join("");
}
