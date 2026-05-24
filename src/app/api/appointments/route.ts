// src/app/api/appointments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { sendAppointmentConfirmation } from "@/lib/email";
import {
  createAppointmentSchema,
  appointmentQuerySchema,
} from "@/schemas/appointment.schema";
import { Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ── GET /api/appointments ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getIdentifier(req), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.user.role as Role, "manage_appointments")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queryResult = appointmentQuerySchema.safeParse({
      patientId: searchParams.get("patientId") ?? undefined,
      doctorId: searchParams.get("doctorId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { patientId, doctorId, status, type, date, from, to, page, limit } =
      queryResult.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Patients can only see their own appointments
    if (session.user.role === "PATIENT") {
      const patient = await prisma.patient.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!patient) {
        return NextResponse.json({ appointments: [], total: 0, page, limit });
      }
      where.patientId = patient.id;
    } else {
      if (patientId) where.patientId = patientId;
      if (doctorId) where.doctorId = doctorId;
    }

    if (status) where.status = status;
    if (type) where.type = type;

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: dayStart, lte: dayEnd };
    } else if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.scheduledAt.lte = toDate;
      }
    }

    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
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
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({ appointments, total, page, limit });
  } catch (error) {
    console.error("[GET /api/appointments]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── POST /api/appointments ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const result = createAppointmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 },
      );
    }

    const {
      patientId,
      doctorId,
      appointmentDate,
      startTime,
      duration,
      type,
      reason,
      notes,
    } = result.data;

    // ── Verify patient ────────────────────────────────────────────────────────
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // ── Verify doctor ─────────────────────────────────────────────────────────
    const doctor = await prisma.user.findFirst({
      where: { id: doctorId, role: Role.DOCTOR, isActive: true },
      select: {
        id: true,
        email: true,
        staffProfile: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
    });
    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found or inactive" },
        { status: 404 },
      );
    }

    // ── Build start / end DateTimes ───────────────────────────────────────────
    const [hours, minutes] = startTime.split(":").map(Number);
    const scheduledAt = new Date(appointmentDate);
    scheduledAt.setHours(hours, minutes, 0, 0);
    const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);

    // Prevent past booking
    if (scheduledAt < new Date()) {
      return NextResponse.json(
        { error: "Cannot book an appointment in the past" },
        { status: 400 },
      );
    }

    // ── Conflict detection ────────────────────────────────────────────────────
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
        AND: [
          { scheduledAt: { lt: endTime } },
          { endTime: { gt: scheduledAt } },
        ],
      },
      select: { id: true, scheduledAt: true, endTime: true },
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
          error: `Doctor already has an appointment from ${fmt(conflict.scheduledAt)} to ${fmt(conflict.endTime)}. Please choose a different time.`,
          conflict: true,
        },
        { status: 409 },
      );
    }

    // ── Create ────────────────────────────────────────────────────────────────
    const doctorFullName = doctor.staffProfile
      ? `${doctor.staffProfile.firstName} ${doctor.staffProfile.lastName}`
      : doctor.email;

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        createdById: session.user.id,
        scheduledAt,
        endTime,
        durationMinutes: duration,
        type,
        reason,
        notes: notes ?? null,
        status: "SCHEDULED",
      },
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

    // ── Audit ─────────────────────────────────────────────────────────────────
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "Appointment",
      resourceId: appointment.id,
      description: `Appointment booked for ${patient.firstName} ${patient.lastName} with Dr. ${doctorFullName} on ${scheduledAt.toLocaleDateString()}`,
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    });

    // ── Email (non-blocking) ──────────────────────────────────────────────────
    if (patient.email) {
      sendAppointmentConfirmation({
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientEmail: patient.email,
        doctorName: doctorFullName,
        appointmentDate: scheduledAt.toLocaleDateString("en-NG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        appointmentTime: scheduledAt.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        reason,
      }).catch(console.error);
    }

    return NextResponse.json(
      { message: "Appointment booked successfully", appointment },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/appointments]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
