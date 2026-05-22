import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerPatientSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must not exceed 50 characters"),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must not exceed 50 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"] as const, {
      error: "Gender is required",
    }),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createStaffSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "PHARMACIST"] as const, {
    error: "Role is required",
  }),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50),
  phone: z.string().optional(),
  department: z.string().optional(),
  qualification: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
