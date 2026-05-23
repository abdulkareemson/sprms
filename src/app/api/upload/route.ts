// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import {
  supabaseAdmin,
  STORAGE_BUCKET,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/supabase";
import { Role } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

// ─── POST /api/upload ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user as { id: string; role: Role };

    // 2. Permission check — only staff with upload_documents permission
    if (!hasPermission(role, "upload_documents")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;
    const recordId = formData.get("recordId") as string | null;

    // 4. Validate required fields
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    // 5. Validate file type (whitelist)
    const mimeType = file.type;
    const extension = ALLOWED_MIME_TYPES[mimeType];

    if (!extension) {
      return NextResponse.json(
        {
          error: `File type not allowed. Accepted types: PDF, JPG, PNG, DOCX`,
        },
        { status: 400 },
      );
    }

    // 6. Validate file size (5MB max)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 },
      );
    }

    // 7. Validate patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // 8. Validate medical record if provided
    if (recordId) {
      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        select: { id: true, patientId: true },
      });

      if (!record) {
        return NextResponse.json(
          { error: "Medical record not found" },
          { status: 404 },
        );
      }

      // Record must belong to this patient
      if (record.patientId !== patientId) {
        return NextResponse.json(
          { error: "Record does not belong to this patient" },
          { status: 400 },
        );
      }
    }

    // 9. Build storage path
    // Format: patients/{patientId}/{year}/{uuid}.{ext}
    const year = new Date().getFullYear();
    const uniqueId = uuidv4();
    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .substring(0, 100);
    const storagePath = `patients/${patientId}/${year}/${uniqueId}-${safeFileName}`;

    // 10. Convert file to buffer and upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload] Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file. Please try again." },
        { status: 500 },
      );
    }

    // 11. Save document metadata to database
    const document = await prisma.patientDocument.create({
      data: {
        patientId,
        recordId: recordId ?? null,
        fileName: file.name,
        fileType: mimeType,
        fileSize: file.size,
        storagePath,
        uploadedById: userId,
      },
    });

    // 12. Audit log
    await createAuditLog({
      userId,
      action: "UPLOAD",
      resource: "PatientDocument",
      resourceId: document.id,
      description: `Uploaded document "${file.name}" for patient ${patient.firstName} ${patient.lastName}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        document: {
          id: document.id,
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          storagePath: document.storagePath,
          createdAt: document.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
