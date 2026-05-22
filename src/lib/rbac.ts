import { Role } from "@prisma/client";

// ─── Permission Definitions ───────────────────────────────────────────────────

export type Permission =
  | "manage_users"
  | "create_staff"
  | "view_all_patients"
  | "register_patient"
  | "edit_patient"
  | "delete_patient"
  | "view_own_profile"
  | "create_medical_record"
  | "create_nursing_note"
  | "record_vitals"
  | "edit_medical_record"
  | "delete_medical_record"
  | "write_prescription"
  | "view_prescriptions"
  | "dispense_medication"
  | "manage_appointments"
  | "upload_documents"
  | "view_documents"
  | "generate_invoice"
  | "view_invoices"
  | "update_payment_status"
  | "generate_reports"
  | "view_audit_logs"
  | "system_settings";

// ─── Role Permission Map ──────────────────────────────────────────────────────

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "manage_users",
    "create_staff",
    "view_all_patients",
    "register_patient",
    "edit_patient",
    "delete_patient",
    "view_own_profile",
    "create_medical_record",
    "create_nursing_note",
    "record_vitals",
    "edit_medical_record",
    "delete_medical_record",
    "write_prescription",
    "view_prescriptions",
    "dispense_medication",
    "manage_appointments",
    "upload_documents",
    "view_documents",
    "generate_invoice",
    "view_invoices",
    "update_payment_status",
    "generate_reports",
    "view_audit_logs",
    "system_settings",
  ],
  DOCTOR: [
    "view_all_patients",
    "register_patient",
    "edit_patient",
    "view_own_profile",
    "create_medical_record",
    "create_nursing_note",
    "record_vitals",
    "edit_medical_record",
    "write_prescription",
    "view_prescriptions",
    "manage_appointments",
    "upload_documents",
    "view_documents",
    "generate_reports",
  ],
  NURSE: [
    "view_all_patients",
    "register_patient",
    "edit_patient",
    "view_own_profile",
    "create_nursing_note",
    "record_vitals",
    "view_prescriptions",
    "manage_appointments",
    "upload_documents",
    "view_documents",
  ],
  RECEPTIONIST: [
    "view_all_patients",
    "register_patient",
    "edit_patient",
    "view_own_profile",
    "manage_appointments",
    "generate_invoice",
    "view_invoices",
    "update_payment_status",
  ],
  PHARMACIST: ["view_own_profile", "view_prescriptions", "dispense_medication"],
  PATIENT: [
    "view_own_profile",
    "view_prescriptions",
    "manage_appointments",
    "view_invoices",
  ],
};

// ─── Permission Checker ───────────────────────────────────────────────────────

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Roles that can access patient data
 */
export const PATIENT_ACCESS_ROLES: Role[] = [
  Role.ADMIN,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
];

/**
 * Staff roles (non-patient)
 */
export const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.PHARMACIST,
];
