import { z } from "zod";

export const createRecordSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  recordType: z.enum(
    [
      "CONSULTATION",
      "LAB_RESULT",
      "NURSING_NOTE",
      "IMAGING",
      "PRESCRIPTION",
      "DISCHARGE_SUMMARY",
      "REFERRAL",
      "VACCINATION",
    ] as const,
    { error: "Record type is required" },
  ),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters"),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  icdCode: z.string().optional(),
  isConfidential: z.boolean().optional().default(false),
});

export const updateRecordSchema = createRecordSchema
  .omit({ patientId: true })
  .partial();

export const createVitalSignSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  recordId: z.string().optional(),
  temperature: z.coerce.number().min(30).max(45).optional(),
  systolicBP: z.coerce.number().min(50).max(300).optional(),
  diastolicBP: z.coerce.number().min(20).max(200).optional(),
  heartRate: z.coerce.number().min(20).max(250).optional(),
  respiratoryRate: z.coerce.number().min(5).max(60).optional(),
  oxygenSaturation: z.coerce.number().min(50).max(100).optional(),
  weight: z.coerce.number().min(0.5).max(500).optional(),
  height: z.coerce.number().min(20).max(300).optional(),
  notes: z.string().optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type CreateVitalSignInput = z.infer<typeof createVitalSignSchema>;
