// src/app/api/audit-logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { Role, AuditAction } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/audit-logs ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const userId = session.user.id;

    if (!hasPermission(role, "view_audit_logs")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20")),
    );
    const filterUserId = searchParams.get("userId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const resource = searchParams.get("resource") ?? undefined;
    const fromDate = searchParams.get("fromDate") ?? undefined;
    const toDate = searchParams.get("toDate") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filterUserId) where.userId = filterUserId;

    if (action) {
      where.action = action as AuditAction;
    }

    if (resource) {
      where.resource = { contains: resource, mode: "insensitive" };
    }

    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lte: new Date(toDate + "T23:59:59.999Z") } : {}),
      };
    }

    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              email: true,
              role: true,
              staffProfile: {
                select: { firstName: true, lastName: true },
              },
              patient: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Action summary for filter display
    const actionSummary = await prisma.auditLog.groupBy({
      by: ["action"],
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    });

    await createAuditLog({
      userId,
      action: AuditAction.READ,
      resource: "AuditLog",
      description: `Viewed audit logs (page ${page})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      logs,
      actionSummary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/audit-logs]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
