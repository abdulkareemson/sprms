// src/schemas/invoice.schema.ts

import { z } from "zod";

// ─── Invoice Item Schema ──────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  description: z
    .string()
    .min(1, "Item description is required")
    .max(200, "Description too long"),
  quantity: z // FIX: remove .default(1) — use required number
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  amount: z.number().min(0, "Amount cannot be negative"),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// ─── Create Invoice Schema ────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),

  appointmentId: z.string().optional().nullable(),

  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one item is required")
    .max(20, "Maximum 20 items per invoice"),

  notes: z.string().max(500, "Notes too long").optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ─── Update Invoice Schema ────────────────────────────────────────────────────

export const updateInvoiceSchema = z.object({
  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one item is required")
    .max(20, "Maximum 20 items per invoice")
    .optional(),

  notes: z.string().max(500, "Notes too long").optional().nullable(),

  paymentStatus: z
    .enum(["PENDING", "PAID", "OVERDUE"] as const, {
      error: "Invalid payment status",
    })
    .optional(),

  paidAt: z.string().datetime().optional().nullable(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ─── Update Payment Status Schema (standalone) ───────────────────────────────

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["PENDING", "PAID", "OVERDUE"] as const, {
    error: "Invalid payment status",
  }),
});

export type UpdatePaymentStatusInput = z.infer<
  typeof updatePaymentStatusSchema
>;

// ─── Query / Filter Schema ────────────────────────────────────────────────────

export const invoiceQuerySchema = z.object({
  patientId: z.string().optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "OVERDUE"] as const).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
