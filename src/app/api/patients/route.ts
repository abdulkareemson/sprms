//src/app/api/patients/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import {
  createPatientSchema,
  patientSearchSchema,
} from "@/schemas/patient.schema";
import { AuditAction, BloodGroup, Gender, Role } from "@prisma/client";
import { generatePatientNumber } from "@/lib/utils/generate-id";

// ─── GET /api/patients — List + search patients ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;

    if (!hasPermission(role, "view_all_patients")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const validation = patientSearchSchema.safeParse({
      search: searchParams.get("search") ?? "",
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "10",
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const { search, page, limit } = validation.data;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          isActive: true,
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            {
              patientNumber: { contains: search, mode: "insensitive" as const },
            },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { isActive: true };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              medicalRecords: true,
              appointments: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.READ,
      resource: "Patient",
      description: `Viewed patient list (search: "${search}", page: ${page})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/patients]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/patients — Register new patient (staff) ───────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role as Role, "register_patient")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createPatientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check for duplicate email if provided
    if (data.email) {
      const existing = await prisma.patient.findFirst({
        where: { email: data.email, isActive: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A patient with this email already exists" },
          { status: 409 },
        );
      }
    }

    const patientNumber = await generatePatientNumber();

    const patient = await prisma.patient.create({
      data: {
        patientNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender as Gender,
        bloodGroup: (data.bloodGroup as BloodGroup) ?? BloodGroup.UNKNOWN,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        state: data.state,
        nationality: data.nationality ?? "Nigerian",
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE,
      resource: "Patient",
      resourceId: patient.id,
      description: `Registered new patient: ${data.firstName} ${data.lastName} (${patientNumber})`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      { message: "Patient registered successfully", patient },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/patients]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
