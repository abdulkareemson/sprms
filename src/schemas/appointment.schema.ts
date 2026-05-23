// src/schemas/appointment.schema.ts

import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export const APPOINTMENT_TYPES = [
  "CONSULTATION",
  "FOLLOW_UP",
  "PROCEDURE",
  "LAB_TEST",
  "IMAGING",
  "VACCINATION",
  "EMERGENCY",
] as const;

// ── Create ────────────────────────────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, { message: "Patient is required" }),
  doctorId: z.string().min(1, { message: "Doctor is required" }),
  appointmentDate: z
    .string()
    .min(1, { message: "Appointment date is required" })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: "Start time must be in HH:MM format",
  }),
  duration: z
    .number({ error: "Duration must be a number" })
    .int()
    .min(15, { message: "Minimum duration is 15 minutes" })
    .max(240, { message: "Maximum duration is 4 hours" })
    .default(30),
  type: z.enum(APPOINTMENT_TYPES, { error: "Invalid appointment type" }),
  reason: z
    .string()
    .min(3, { message: "Reason must be at least 3 characters" })
    .max(500, { message: "Reason must not exceed 500 characters" }),
  notes: z
    .string()
    .max(1000, { message: "Notes must not exceed 1000 characters" })
    .optional(),
});

// ── Update ────────────────────────────────────────────────────────────────────
export const updateAppointmentSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES, { error: "Invalid status" }).optional(),
  appointmentDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional(),
  startTime: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
      message: "Start time must be in HH:MM format",
    })
    .optional(),
  duration: z
    .number({ error: "Duration must be a number" })
    .int()
    .min(15, { message: "Minimum duration is 15 minutes" })
    .max(240, { message: "Maximum duration is 4 hours" })
    .optional(),
  type: z
    .enum(APPOINTMENT_TYPES, { error: "Invalid appointment type" })
    .optional(),
  reason: z
    .string()
    .min(3, { message: "Reason must be at least 3 characters" })
    .max(500, { message: "Reason must not exceed 500 characters" })
    .optional(),
  notes: z
    .string()
    .max(1000, { message: "Notes must not exceed 1000 characters" })
    .optional(),
  cancellationReason: z
    .string()
    .max(500, { message: "Cancellation reason must not exceed 500 characters" })
    .optional(),
});

// ── Cancel ────────────────────────────────────────────────────────────────────
export const cancelAppointmentSchema = z.object({
  cancellationReason: z
    .string()
    .min(5, { message: "Please provide a reason (min 5 characters)" })
    .max(500, { message: "Must not exceed 500 characters" }),
});

// ── Query params ──────────────────────────────────────────────────────────────
export const appointmentQuerySchema = z.object({
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  status: z.enum(APPOINTMENT_STATUSES, { error: "Invalid status" }).optional(),
  type: z.enum(APPOINTMENT_TYPES, { error: "Invalid type" }).optional(),
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Exported types ────────────────────────────────────────────────────────────
export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.input<typeof updateAppointmentSchema>;
export type CancelAppointmentInput = z.input<typeof cancelAppointmentSchema>;
export type AppointmentQueryInput = z.input<typeof appointmentQuerySchema>;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
