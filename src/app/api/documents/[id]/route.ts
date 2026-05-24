// src/app/api/documents/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { generateSignedUrl, deleteStorageFile } from "@/lib/supabase";
import { Role } from "@prisma/client";
import {
  checkRateLimit,
  getIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// ─── GET /api/documents/[id] — Get single doc with fresh signed URL ───────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_READ);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    if (!hasPermission(role, "view_documents")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const document = await prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Generate fresh signed URL (1 hour expiry)
    const signedUrl = await generateSignedUrl(document.storagePath, 3600);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 },
      );
    }

    await createAuditLog({
      userId,
      action: "READ",
      resource: "PatientDocument",
      resourceId: document.id,
      description: `Downloaded document "${document.fileName}"`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ document: { ...document, signedUrl } });
  } catch (error) {
    console.error("[GET /api/documents/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/documents/[id] ───────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(getIdentifier(request), RATE_LIMITS.API_WRITE);
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    // Only admin and doctors can delete documents
    if (!hasPermission(role, "upload_documents") && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const document = await prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Delete from Supabase Storage first
    const deleted = await deleteStorageFile(document.storagePath);

    if (!deleted) {
      // Log but continue — remove DB record even if storage delete fails
      console.error(
        `[Documents] Storage delete failed for path: ${document.storagePath}`,
      );
    }

    // Delete from database
    await prisma.patientDocument.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: "DELETE",
      resource: "PatientDocument",
      resourceId: document.id,
      description: `Deleted document "${document.fileName}"`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/documents/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
