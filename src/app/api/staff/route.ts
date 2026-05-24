// src/app/api/staff/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createStaffSchema } from "@/schemas/auth.schema";
import { AuditAction, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendStaffWelcomeEmail } from "@/lib/email";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/staff ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const roleFilter = searchParams.get("role") ?? "";

    const staff = await prisma.user.findMany({
      where: {
        role: { not: Role.PATIENT },
        ...(roleFilter && { role: roleFilter as Role }),
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

// ─── POST /api/staff ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

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

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // FIX: Use crypto.randomBytes for cryptographically secure temp password
    const temporaryPassword = generateSecureTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

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

    await sendStaffWelcomeEmail(
      data.email,
      `${data.firstName} ${data.lastName}`,
      data.role,
      temporaryPassword,
    );

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

// ─── FIX: Cryptographically secure temporary password ────────────────────────

function generateSecureTemporaryPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "@#$%&!";
  const all = upper + lower + digits + special;

  // Use crypto.randomBytes for true randomness
  const bytes = crypto.randomBytes(12);
  const chars: string[] = [];

  // Guarantee at least one from each character class
  chars.push(upper[crypto.randomBytes(1)[0] % upper.length]);
  chars.push(lower[crypto.randomBytes(1)[0] % lower.length]);
  chars.push(digits[crypto.randomBytes(1)[0] % digits.length]);
  chars.push(special[crypto.randomBytes(1)[0] % special.length]);

  // Fill remaining 8 characters
  for (let i = 4; i < 12; i++) {
    chars.push(all[bytes[i] % all.length]);
  }

  // Shuffle using Fisher-Yates with crypto.randomBytes
  const shuffleBytes = crypto.randomBytes(chars.length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}