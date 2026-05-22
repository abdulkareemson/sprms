import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

interface CreateAuditLogParams {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry in the database.
 * Never throws — audit logging should never break the main flow.
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        description: params.description,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    // Log to console but never throw — audit failure should not block operations
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}

/**
 * Extract IP address from a Next.js request
 */
export function getIpAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Extract user agent from a Next.js request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get("user-agent") ?? "unknown";
}