// src/app/api/reports/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { Role, AuditAction } from "@prisma/client";
import { decrypt } from "@/lib/encryption";

// ─── GET /api/reports ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const userId = session.user.id;

    if (!hasPermission(role, "generate_reports")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") ?? "patients";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20")),
    );
    const skip = (page - 1) * limit;

    const dateFilter =
      fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate + "T23:59:59.999Z") } : {}),
            },
          }
        : {};

    // ── Patient Records Report ─────────────────────────────────────────────
    if (reportType === "patients") {
      const where = { isActive: true, ...dateFilter };
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            phone: true,
            email: true,
            city: true,
            state: true,
            createdAt: true,
            _count: {
              select: {
                medicalRecords: true,
                appointments: true,
                invoices: true,
              },
            },
          },
        }),
        prisma.patient.count({ where }),
      ]);

      // Aggregate summary
      const summary = {
        total,
        byGender: await prisma.patient.groupBy({
          by: ["gender"],
          where,
          _count: { gender: true },
        }),
        byBloodGroup: await prisma.patient.groupBy({
          by: ["bloodGroup"],
          where,
          _count: { bloodGroup: true },
        }),
      };

      await createAuditLog({
        userId,
        action: AuditAction.EXPORT,
        resource: "Report",
        description: `Generated patient records report (${fromDate ?? "all"} to ${toDate ?? "now"})`,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({
        reportType: "patients",
        data: patients,
        summary,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // ── Appointment Summary Report ─────────────────────────────────────────
    if (reportType === "appointments") {
      const apptWhere =
        role === Role.DOCTOR
          ? { doctorId: userId, ...dateFilter }
          : { ...dateFilter };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where: apptWhere,
          skip,
          take: limit,
          orderBy: { scheduledAt: "desc" },
          include: {
            patient: {
              select: {
                patientNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            doctor: {
              select: {
                staffProfile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        }),
        prisma.appointment.count({ where: apptWhere }),
      ]);

      const statusSummary = await prisma.appointment.groupBy({
        by: ["status"],
        where: apptWhere,
        _count: { status: true },
      });

      const typeSummary = await prisma.appointment.groupBy({
        by: ["type"],
        where: apptWhere,
        _count: { type: true },
      });

      await createAuditLog({
        userId,
        action: AuditAction.EXPORT,
        resource: "Report",
        description: `Generated appointment summary report`,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({
        reportType: "appointments",
        data: appointments,
        summary: { total, statusSummary, typeSummary },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // ── Revenue / Billing Report — Admin only ──────────────────────────────
    if (reportType === "revenue") {
      if (role !== Role.ADMIN) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where: dateFilter,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            patient: {
              select: {
                patientNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            appointment: {
              select: { type: true, scheduledAt: true },
            },
          },
        }),
        prisma.invoice.count({ where: dateFilter }),
      ]);

      const allInvoices = await prisma.invoice.findMany({
        where: dateFilter,
        select: { totalAmount: true, paymentStatus: true },
      });

      const totalRevenue = allInvoices.reduce(
        (s, inv) => s + inv.totalAmount,
        0,
      );
      const paidRevenue = allInvoices
        .filter((inv) => inv.paymentStatus === "PAID")
        .reduce((s, inv) => s + inv.totalAmount, 0);
      const pendingRevenue = allInvoices
        .filter((inv) => inv.paymentStatus === "PENDING")
        .reduce((s, inv) => s + inv.totalAmount, 0);
      const overdueRevenue = allInvoices
        .filter((inv) => inv.paymentStatus === "OVERDUE")
        .reduce((s, inv) => s + inv.totalAmount, 0);

      const statusCounts = await prisma.invoice.groupBy({
        by: ["paymentStatus"],
        where: dateFilter,
        _count: { paymentStatus: true },
        _sum: { totalAmount: true },
      });

      await createAuditLog({
        userId,
        action: AuditAction.EXPORT,
        resource: "Report",
        description: `Generated revenue/billing report`,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({
        reportType: "revenue",
        data: invoices,
        summary: {
          total,
          totalRevenue,
          paidRevenue,
          pendingRevenue,
          overdueRevenue,
          statusCounts,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // ── Medical Records Report ─────────────────────────────────────────────
    if (reportType === "records") {
      const recordsWhere =
        role === Role.DOCTOR
          ? { createdById: userId, ...dateFilter }
          : { ...dateFilter };

      const [records, total] = await Promise.all([
        prisma.medicalRecord.findMany({
          where: recordsWhere,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            patient: {
              select: {
                patientNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            createdBy: {
              select: {
                staffProfile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        }),
        prisma.medicalRecord.count({ where: recordsWhere }),
      ]);

      // Decrypt sensitive fields before sending
      const decryptedRecords = records.map((r) => ({
        ...r,
        diagnosis: r.diagnosis ? decrypt(r.diagnosis) : null,
        treatment: r.treatment ? decrypt(r.treatment) : null,
        notes: r.notes ? decrypt(r.notes) : null,
      }));

      const typeSummary = await prisma.medicalRecord.groupBy({
        by: ["recordType"],
        where: recordsWhere,
        _count: { recordType: true },
      });

      await createAuditLog({
        userId,
        action: AuditAction.EXPORT,
        resource: "Report",
        description: `Generated medical records report`,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({
        reportType: "records",
        data: decryptedRecords,
        summary: { total, typeSummary },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid report type. Use: patients, appointments, revenue, records",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
