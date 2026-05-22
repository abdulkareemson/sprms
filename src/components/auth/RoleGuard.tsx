//src/components/auth/RoleGuard.tsx

"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/rbac";

interface RoleGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  roles?: Role[];
  fallback?: React.ReactNode;
}

/**
 * Component-level permission wrapper.
 * Renders children only if the current user has the required permission or role.
 */
export function RoleGuard({
  children,
  permission,
  roles,
  fallback = null,
}: RoleGuardProps) {
  const { data: session } = useSession();

  if (!session?.user) return <>{fallback}</>;

  const userRole = session.user.role as Role;

  // Check permission
  if (permission && !hasPermission(userRole, permission)) {
    return <>{fallback}</>;
  }

  // Check roles
  if (roles && !roles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
