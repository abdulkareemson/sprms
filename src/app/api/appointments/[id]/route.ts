// src/app/api/appointments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import {
  sendAppointmentCancellation,
  sendAppointmentConfirmation,
  sendAppointmentRescheduled,
} from "@/lib/email";
import {
  updateAppointmentSchema,
  cancelAppointmentSchema,
  type AppointmentStatus,
} from "@/schemas/appointment.schema";
import { Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

// ── GET /api/appointments/[id] ────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const rl = checkRateLimit(getIdentifier(_req), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.user.role as Role, "manage_appointments")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        doctor: {
          select: {
            id: true,
            email: true,
            staffProfile: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    // Patients can only view their own
    if (session.user.role === "PATIENT") {
      const patient = await prisma.patient.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!patient || appointment.patientId !== patient.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (
      session.user.role === Role.DOCTOR &&
      appointment.doctorId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("[GET /api/appointments/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PATCH /api/appointments/[id] ──────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const rl = checkRateLimit(getIdentifier(req), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.user.role as Role, "manage_appointments")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.user.role === Role.PATIENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const isCancellation = body.status === "CANCELLED";

    // Extra validation when cancelling
    if (isCancellation) {
      const cancelResult = cancelAppointmentSchema.safeParse(body);
      if (!cancelResult.success) {
        return NextResponse.json(
          {
            error: "Cancellation reason is required",
            details: cancelResult.error.issues,
          },
          { status: 400 },
        );
      }
    }

    const result = updateAppointmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 },
      );
    }

    // Fetch existing record (with relations for email)
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true } },
        doctor: {
          select: {
            email: true,
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    if (
      session.user.role === Role.DOCTOR &&
      existing.doctorId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      result.data.status &&
      !STATUS_TRANSITIONS[existing.status].includes(result.data.status)
    ) {
      return NextResponse.json(
        {
          error: `Cannot change appointment status from ${existing.status.toLowerCase()} to ${result.data.status.toLowerCase()}`,
        },
        { status: 400 },
      );
    }

    if (result.data.status === "NO_SHOW" && existing.endTime > new Date()) {
      return NextResponse.json(
        {
          error: "An appointment can only be marked no-show after it has ended",
        },
        { status: 400 },
      );
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return NextResponse.json(
        {
          error: `Cannot modify a ${existing.status.toLowerCase()} appointment`,
        },
        { status: 400 },
      );
    }

    const {
      appointmentDate,
      startTime,
      duration,
      cancellationReason,
      ...rest
    } = result.data;

    // ── Recompute times if date, time, or duration changed ────────────────────
    let newScheduledAt: Date | undefined;
    let newEndTime: Date | undefined;

    const isRescheduling =
      appointmentDate !== undefined ||
      startTime !== undefined ||
      duration !== undefined;

    if (isRescheduling) {
      if (existing.status !== "SCHEDULED" && existing.status !== "CONFIRMED") {
        return NextResponse.json(
          {
            error:
              "Only scheduled or confirmed appointments can be rescheduled",
          },
          { status: 400 },
        );
      }

      if ((appointmentDate && !startTime) || (!appointmentDate && startTime)) {
        return NextResponse.json(
          {
            error: "Provide both appointment date and start time to reschedule",
          },
          { status: 400 },
        );
      }

      const [hours, minutes] = startTime
        ? startTime.split(":").map(Number)
        : [existing.scheduledAt.getHours(), existing.scheduledAt.getMinutes()];
      if (appointmentDate) {
        const [year, month, day] = appointmentDate.split("-").map(Number);
        newScheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
      } else {
        newScheduledAt = new Date(existing.scheduledAt);
        newScheduledAt.setHours(hours, minutes, 0, 0);
      }
      const dur = duration ?? existing.durationMinutes;
      newEndTime = new Date(newScheduledAt.getTime() + dur * 60 * 1000);

      if (newScheduledAt < new Date()) {
        return NextResponse.json(
          { error: "Cannot reschedule an appointment in the past" },
          { status: 400 },
        );
      }

      // Conflict detection (exclude self)
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: existing.doctorId,
          status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
          AND: [
            { scheduledAt: { lt: newEndTime } },
            { endTime: { gt: newScheduledAt } },
          ],
        },
        select: { scheduledAt: true, endTime: true },
      });

      if (conflict) {
        const fmt = (d: Date) =>
          d.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        return NextResponse.json(
          {
            error: `Doctor already has an appointment from ${fmt(conflict.scheduledAt)} to ${fmt(conflict.endTime)}.`,
            conflict: true,
          },
          { status: 409 },
        );
      }
    }

    // ── Build update payload ──────────────────────────────────────────────────
    const updateData: Record<string, unknown> = { ...rest };

    // Map cancellationReason → cancelReason (DB column name)
    if (cancellationReason !== undefined) {
      updateData.cancelReason = cancellationReason;
    }
    delete updateData.cancellationReason;

    if (newScheduledAt) updateData.scheduledAt = newScheduledAt;
    if (newEndTime) updateData.endTime = newEndTime;
    if (isRescheduling) {
      updateData.durationMinutes = duration ?? existing.durationMinutes;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            email: true,
            staffProfile: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
                department: true,
              },
            },
          },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "Appointment",
      resourceId: id,
      description: `Appointment ${id} updated — status: ${updated.status}`,
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    });

    const doctorName = existing.doctor.staffProfile
      ? `${existing.doctor.staffProfile.firstName} ${existing.doctor.staffProfile.lastName}`
      : existing.doctor.email;

    if (
      result.data.status === "CONFIRMED" &&
      existing.status !== "CONFIRMED" &&
      existing.patient.email
    ) {
      sendAppointmentConfirmation({
        patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
        patientEmail: existing.patient.email,
        doctorName,
        appointmentDate: updated.scheduledAt.toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        appointmentTime: updated.scheduledAt.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        reason: existing.reason ?? "Appointment",
      }).catch(console.error);
    }

    if (isRescheduling && existing.patient.email) {
      sendAppointmentRescheduled({
        patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
        patientEmail: existing.patient.email,
        doctorName,
        previousDate: existing.scheduledAt.toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        previousTime: existing.scheduledAt.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        appointmentDate: updated.scheduledAt.toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        appointmentTime: updated.scheduledAt.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      }).catch(console.error);
    }

    // Send cancellation email
    if (isCancellation && existing.patient.email) {
      sendAppointmentCancellation({
        patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
        patientEmail: existing.patient.email,
        doctorName,
        appointmentDate: existing.scheduledAt.toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        appointmentTime: existing.scheduledAt.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        reason: cancellationReason ?? "Not specified",
      }).catch(console.error);
    }

    return NextResponse.json({
      message: "Appointment updated successfully",
      appointment: updated,
    });
  } catch (error) {
    console.error("[PATCH /api/appointments/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/appointments/[id] — Admin only ────────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const rl = checkRateLimit(getIdentifier(req), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    await prisma.appointment.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "Appointment",
      resourceId: id,
      description: `Appointment ${id} permanently deleted by admin`,
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    });

    return NextResponse.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/appointments/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
