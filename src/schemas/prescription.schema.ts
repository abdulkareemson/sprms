// src/schemas/prescription.schema.ts

import { z } from "zod";

export const DISPENSE_STATUSES = [
  "PENDING",
  "DISPENSED",
  "PARTIALLY_DISPENSED",
] as const;

export const ROUTES_OF_ADMINISTRATION = [
  "ORAL",
  "INTRAVENOUS",
  "INTRAMUSCULAR",
  "SUBCUTANEOUS",
  "TOPICAL",
  "INHALATION",
  "SUBLINGUAL",
  "RECTAL",
  "NASAL",
  "OPHTHALMIC",
  "OTIC",
  "OTHER",
] as const;

// ── Create ────────────────────────────────────────────────────────────────────
export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, { message: "Patient is required" }),
  recordId: z.string().optional(),
  medicationName: z
    .string()
    .min(2, { message: "Medication name must be at least 2 characters" })
    .max(200, { message: "Medication name must not exceed 200 characters" }),
  dosage: z
    .string()
    .min(1, { message: "Dosage is required" })
    .max(100, { message: "Dosage must not exceed 100 characters" }),
  frequency: z
    .string()
    .min(1, { message: "Frequency is required" })
    .max(100, { message: "Frequency must not exceed 100 characters" }),
  duration: z
    .string()
    .min(1, { message: "Duration is required" })
    .max(100, { message: "Duration must not exceed 100 characters" }),
  route: z.enum(ROUTES_OF_ADMINISTRATION, {
    error: "Invalid route of administration",
  }),
  instructions: z
    .string()
    .max(1000, { message: "Instructions must not exceed 1000 characters" })
    .optional(),
});

// ── Dispense ──────────────────────────────────────────────────────────────────
export const dispensePrescriptionSchema = z.object({
  dispenseStatus: z.enum(DISPENSE_STATUSES, {
    error: "Invalid dispense status",
  }),
  dispensingNotes: z
    .string()
    .max(500, { message: "Dispensing notes must not exceed 500 characters" })
    .optional(),
});

// ── Query ─────────────────────────────────────────────────────────────────────
export const prescriptionQuerySchema = z.object({
  patientId: z.string().optional(),
  recordId: z.string().optional(),
  dispenseStatus: z
    .enum(DISPENSE_STATUSES, { error: "Invalid dispense status" })
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Exported types ────────────────────────────────────────────────────────────
export type CreatePrescriptionInput = z.input<typeof createPrescriptionSchema>;
export type DispensePrescriptionInput = z.input<
  typeof dispensePrescriptionSchema
>;
export type PrescriptionQueryInput = z.input<typeof prescriptionQuerySchema>;
export type DispenseStatus = (typeof DISPENSE_STATUSES)[number];
export type RouteOfAdministration = (typeof ROUTES_OF_ADMINISTRATION)[number];
