// src/hooks/usePermission.ts

"use client";

import { useSession } from "next-auth/react";
import { hasPermission as checkPermission, type Permission } from "@/lib/rbac";
import { Role } from "@prisma/client";

// ─── Return type ──────────────────────────────────────────────────────────────

interface UsePermissionReturn {
  hasPermission: (permission: Permission) => boolean;
  role: Role | null;
  isLoading: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermission(): UsePermissionReturn {
  const { data: session, status } = useSession();

  const role = (session?.user?.role as Role) ?? null;
  const isLoading = status === "loading";

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return checkPermission(role, permission);
  };

  return {
    hasPermission,
    role,
    isLoading,
  };
}
