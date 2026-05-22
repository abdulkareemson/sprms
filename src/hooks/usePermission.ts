//src/hooks/usePermission.ts

"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/rbac";

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();

  if (!session?.user?.role) return false;

  return hasPermission(session.user.role as Role, permission);
}

export function useRole(): Role | null {
  const { data: session } = useSession();
  return (session?.user?.role as Role) ?? null;
}

export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
