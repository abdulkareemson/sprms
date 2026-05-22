import { Role } from "@prisma/client";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
  badge?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StaffWithProfile {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  staffProfile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    department: string | null;
    qualification: string | null;
    licenseNumber: string | null;
  } | null;
}
