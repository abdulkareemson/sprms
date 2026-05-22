import { z } from "zod";

export const createPatientSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must not exceed 50 characters"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must not exceed 50 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"] as const, {
    error: "Gender is required",
  }),
  bloodGroup: z
    .enum(
      [
        "A_POSITIVE",
        "A_NEGATIVE",
        "B_POSITIVE",
        "B_NEGATIVE",
        "AB_POSITIVE",
        "AB_NEGATIVE",
        "O_POSITIVE",
        "O_NEGATIVE",
        "UNKNOWN",
      ] as const,
      { error: "Invalid blood group" },
    )
    .optional()
    .default("UNKNOWN"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  nationality: z.string().optional().default("Nigerian"),

  // Emergency contact
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),

  // Insurance
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientSearchSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientSearchInput = z.infer<typeof patientSearchSchema>;
