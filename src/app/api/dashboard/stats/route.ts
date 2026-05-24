// src/app/api/dashboard/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { Role, AuditAction } from "@prisma/client";
import {
  startOfMonth,
  subMonths,
  startOfWeek,
  subWeeks,
  format,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────

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

    // Only ADMIN and DOCTOR get chart stats
    if (!hasPermission(role, "generate_reports")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // ── Patient registration trend (last 6 months) ────────────────────────
    const patientTrend = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(now, 5 - i));
        const monthEnd = startOfMonth(subMonths(now, 4 - i));
        return prisma.patient
          .count({
            where: {
              createdAt: { gte: monthStart, lt: monthEnd },
              isActive: true,
            },
          })
          .then((count) => ({
            month: format(monthStart, "MMM yyyy"),
            patients: count,
          }));
      }),
    );

    // ── Appointment trend (last 6 weeks) ──────────────────────────────────
    const appointmentTrend = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(now, 5 - i), {
          weekStartsOn: 1,
        });
        const weekEnd = startOfWeek(subWeeks(now, 4 - i), { weekStartsOn: 1 });

        const where =
          role === Role.DOCTOR
            ? { doctorId: userId, scheduledAt: { gte: weekStart, lt: weekEnd } }
            : { scheduledAt: { gte: weekStart, lt: weekEnd } };

        return prisma.appointment.count({ where }).then((count) => ({
          week: format(weekStart, "MMM d"),
          appointments: count,
        }));
      }),
    );

    // ── Record type distribution ───────────────────────────────────────────
    const recordTypeRaw = await prisma.medicalRecord.groupBy({
      by: ["recordType"],
      _count: { recordType: true },
      ...(role === Role.DOCTOR ? { where: { createdById: userId } } : {}),
    });

    const recordTypeDistribution = recordTypeRaw.map((r) => ({
      type: r.recordType
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      count: r._count.recordType,
    }));

    // ── Appointment status distribution ───────────────────────────────────
    const apptStatusRaw = await prisma.appointment.groupBy({
      by: ["status"],
      _count: { status: true },
      ...(role === Role.DOCTOR ? { where: { doctorId: userId } } : {}),
    });

    const appointmentStatusDistribution = apptStatusRaw.map((a) => ({
      status: a.status.replace(/_/g, " "),
      count: a._count.status,
    }));

    // ── Revenue summary (last 6 months) — Admin only ──────────────────────
    let revenueTrend: { month: string; revenue: number; paid: number }[] = [];
    if (role === Role.ADMIN) {
      revenueTrend = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const monthStart = startOfMonth(subMonths(now, 5 - i));
          const monthEnd = startOfMonth(subMonths(now, 4 - i));

          const invoices = await prisma.invoice.findMany({
            where: { createdAt: { gte: monthStart, lt: monthEnd } },
            select: { totalAmount: true, paymentStatus: true },
          });

          const revenue = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
          const paid = invoices
            .filter((inv) => inv.paymentStatus === "PAID")
            .reduce((s, inv) => s + inv.totalAmount, 0);

          return {
            month: format(monthStart, "MMM yyyy"),
            revenue,
            paid,
          };
        }),
      );
    }

    // ── Today's summary ───────────────────────────────────────────────────
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todayApptWhere =
      role === Role.DOCTOR
        ? {
            doctorId: userId,
            scheduledAt: { gte: todayStart, lte: todayEnd },
          }
        : { scheduledAt: { gte: todayStart, lte: todayEnd } };

    const [todayTotal, todayCompleted, todayCancelled] = await Promise.all([
      prisma.appointment.count({ where: todayApptWhere }),
      prisma.appointment.count({
        where: { ...todayApptWhere, status: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { ...todayApptWhere, status: "CANCELLED" },
      }),
    ]);

    await createAuditLog({
      userId,
      action: AuditAction.READ,
      resource: "DashboardStats",
      description: "Viewed dashboard statistics and charts",
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      patientTrend,
      appointmentTrend,
      recordTypeDistribution,
      appointmentStatusDistribution,
      revenueTrend,
      todaySummary: {
        total: todayTotal,
        completed: todayCompleted,
        cancelled: todayCancelled,
        remaining: todayTotal - todayCompleted - todayCancelled,
      },
    });
  } catch (error) {
    console.error("[GET /api/dashboard/stats]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}