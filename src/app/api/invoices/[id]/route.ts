// src/app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import {
  updateInvoiceSchema,
  updatePaymentStatusSchema,
} from "@/schemas/invoice.schema";
import { Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── Shared: Fetch invoice with full relations ────────────────────────────────

async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          state: true,
          insuranceProvider: true,
          insuranceNumber: true,
        },
      },
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          type: true,
          reason: true,
          doctor: {
            select: {
              staffProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  specialization: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

// ─── GET /api/invoices/[id] ───────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    if (!hasPermission(role, "view_invoices")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Patients can only view their own invoices
    if (role === "PATIENT") {
      const patientRecord = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!patientRecord || invoice.patientId !== patientRecord.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Audit log
    await createAuditLog({
      userId,
      action: "READ",
      resource: "Invoice",
      resourceId: invoice.id,
      description: `Viewed invoice ${invoice.invoiceNumber}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("[GET /api/invoices/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/invoices/[id] ───────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    // Must have either generate_invoice (edit items)
    // or update_payment_status
    const canEditInvoice = hasPermission(role, "generate_invoice");
    const canUpdatePayment = hasPermission(role, "update_payment_status");

    if (!canEditInvoice && !canUpdatePayment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Paid invoices cannot be edited (items/notes)
    // Only payment status can be changed on paid invoices (e.g. mark back to pending)
    const body = await request.json();

    // Detect if this is a payment status update only
    const isPaymentUpdate =
      Object.keys(body).length === 1 && "paymentStatus" in body;

    if (isPaymentUpdate) {
      // Validate with standalone payment status schema
      if (!canUpdatePayment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = updatePaymentStatusSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 },
        );
      }

      const { paymentStatus } = result.data;
      const paidAt = paymentStatus === "PAID" ? new Date() : null;

      const updated = await prisma.invoice.update({
        where: { id },
        data: { paymentStatus, paidAt },
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          appointment: { select: { id: true, scheduledAt: true, type: true } },
        },
      });

      await createAuditLog({
        userId,
        action: "UPDATE",
        resource: "Invoice",
        resourceId: invoice.id,
        description: `Updated payment status of invoice ${invoice.invoiceNumber} to ${paymentStatus}`,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({
        message: "Payment status updated successfully",
        invoice: updated,
      });
    }

    // Full invoice edit (items, notes)
    if (!canEditInvoice) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (invoice.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Cannot edit a paid invoice" },
        { status: 400 },
      );
    }

    const result = updateInvoiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { items, notes, paymentStatus } = result.data;

    // Recalculate total if items are updated
    const totalAmount = items
      ? items.reduce((sum, item) => sum + item.amount, 0)
      : invoice.totalAmount;

    const paidAt =
      paymentStatus === "PAID"
        ? new Date()
        : paymentStatus === "PENDING" || paymentStatus === "OVERDUE"
          ? null
          : invoice.paidAt;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(items ? { items, totalAmount } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(paymentStatus ? { paymentStatus, paidAt } : {}),
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        appointment: { select: { id: true, scheduledAt: true, type: true } },
      },
    });

    await createAuditLog({
      userId,
      action: "UPDATE",
      resource: "Invoice",
      resourceId: invoice.id,
      description: `Updated invoice ${invoice.invoiceNumber}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      message: "Invoice updated successfully",
      invoice: updated,
    });
  } catch (error) {
    console.error("[PUT /api/invoices/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/invoices/[id] ────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    // Only ADMIN can delete invoices
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, invoiceNumber: true, paymentStatus: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Prevent deleting paid invoices
    if (invoice.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Cannot delete a paid invoice" },
        { status: 400 },
      );
    }

    await prisma.invoice.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: "DELETE",
      resource: "Invoice",
      resourceId: invoice.id,
      description: `Deleted invoice ${invoice.invoiceNumber}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/invoices/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
