// src/app/api/invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/utils/generate-id";
import {
  createInvoiceSchema,
  invoiceQuerySchema,
} from "@/schemas/invoice.schema";
import { Role, PaymentStatus } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/invoices ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    // 2. Permission check
    if (!hasPermission(role, "view_invoices")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Parse + validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = invoiceQuerySchema.safeParse({
      patientId: searchParams.get("patientId") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { patientId, paymentStatus, page, limit, search, fromDate, toDate } =
      queryResult.data;

    // 4. Build where clause
    // Patients can only see their own invoices
    const where: Record<string, unknown> = {};

    if (role === "PATIENT") {
      // Find the patient record linked to this user
      const patientRecord = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!patientRecord) {
        return NextResponse.json(
          { error: "Patient profile not found" },
          { status: 404 },
        );
      }

      where.patientId = patientRecord.id;
    } else {
      // Staff can filter by specific patient
      if (patientId) where.patientId = patientId;
    }

    // Payment status filter
    if (paymentStatus) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    // Date range filter
    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lte: new Date(toDate) } : {}),
      };
    }

    // Search by invoice number
    if (search) {
      where.invoiceNumber = {
        contains: search,
        mode: "insensitive",
      };
    }

    // 5. Paginated query
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          appointment: {
            select: {
              id: true,
              scheduledAt: true,
              type: true,
              doctor: {
                select: {
                  staffProfile: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // 6. Audit log
    await createAuditLog({
      userId,
      action: "READ",
      resource: "Invoice",
      description: `Viewed invoice list (page ${page})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/invoices]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/invoices ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);
  
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    // 2. Permission check
    if (!hasPermission(role, "generate_invoice")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Parse body
    const body = await request.json();
    const result = createInvoiceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { patientId, appointmentId, items, notes } = result.data;

    // 4. Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // 5. Verify appointment exists if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 },
        );
      }

      // Appointment must belong to this patient
      if (appointment.patientId !== patientId) {
        return NextResponse.json(
          { error: "Appointment does not belong to this patient" },
          { status: 400 },
        );
      }
    }

    // 6. Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // 7. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // 8. Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId,
        appointmentId: appointmentId ?? null,
        items,
        totalAmount,
        notes: notes ?? null,
        paymentStatus: "PENDING",
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            type: true,
          },
        },
      },
    });

    // 9. Audit log
    await createAuditLog({
      userId,
      action: "CREATE",
      resource: "Invoice",
      resourceId: invoice.id,
      description: `Created invoice ${invoiceNumber} for patient ${patient.firstName} ${patient.lastName} — ₦${totalAmount.toLocaleString()}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      { message: "Invoice created successfully", invoice },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/invoices]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
