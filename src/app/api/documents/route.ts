// src/app/api/documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { generateSignedUrl } from "@/lib/supabase";
import { Role } from "@prisma/client";

// ─── GET /api/documents?patientId=xxx&recordId=xxx ────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    if (!hasPermission(role, "view_documents")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const recordId = searchParams.get("recordId");

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 },
      );
    }

    // Build where clause
    const where: Record<string, string> = { patientId };
    if (recordId) where.recordId = recordId;

    const documents = await prisma.patientDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        // Who uploaded this document
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const signedUrl = await generateSignedUrl(doc.storagePath);
        return {
          id: doc.id,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          storagePath: doc.storagePath,
          signedUrl,
          patientId: doc.patientId,
          recordId: doc.recordId,
          uploadedById: doc.uploadedById,
          createdAt: doc.createdAt,
          patient: doc.patient,
        };
      }),
    );

    await createAuditLog({
      userId,
      action: "READ",
      resource: "PatientDocument",
      description: `Viewed documents for patient ${patientId}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ documents: documentsWithUrls });
  } catch (error) {
    console.error("[GET /api/documents]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
