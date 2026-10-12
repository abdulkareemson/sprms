// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoRoles = [
  "ADMIN",
  "PATIENT",
  "DOCTOR",
  "NURSE",
  "PHARMACIST",
  "RECEPTIONIST",
] as const;

type DemoRole = (typeof demoRoles)[number];

function readDemoPasswords(): Record<DemoRole, string> {
  const passwords = {
    ADMIN: process.env.SPRMS_SEED_ADMIN_PASSWORD ?? "",
    PATIENT: process.env.SPRMS_SEED_PATIENT_PASSWORD ?? "",
    DOCTOR: process.env.SPRMS_SEED_DOCTOR_PASSWORD ?? "",
    NURSE: process.env.SPRMS_SEED_NURSE_PASSWORD ?? "",
    PHARMACIST: process.env.SPRMS_SEED_PHARMACIST_PASSWORD ?? "",
    RECEPTIONIST: process.env.SPRMS_SEED_RECEPTIONIST_PASSWORD ?? "",
  } satisfies Record<DemoRole, string>;

  const invalidRoles = demoRoles.filter((role) => {
    const password = passwords[role];
    return (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    );
  });

  if (invalidRoles.length) {
    throw new Error(
      `Set a strong password for each demo role before seeding: ${invalidRoles.join(", ")}`,
    );
  }

  return passwords;
}

async function main() {
  console.log("🌱 Seeding database...");

  const demoPasswords = readDemoPasswords();
  const passwordHashes = Object.fromEntries(
    await Promise.all(
      demoRoles.map(async (role) => [
        role,
        await bcrypt.hash(demoPasswords[role], 12),
      ]),
    ),
  ) as Record<DemoRole, string>;

  // ─── Clean existing data ───────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.patientDocument.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();

  // ─── 1. ADMIN ─────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "admin@sprms.com",
      password: passwordHashes.ADMIN,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      staffProfile: {
        create: {
          firstName: "System",
          lastName: "Administrator",
          department: "Administration",
        },
      },
    },
  });

  // ─── 2. DOCTOR ────────────────────────────────────────────────────────────
  const doctor = await prisma.user.create({
    data: {
      email: "doctor@sprms.com",
      password: passwordHashes.DOCTOR,
      role: "DOCTOR",
      isActive: true,
      mustChangePassword: false,
      staffProfile: {
        create: {
          firstName: "Aminu",
          lastName: "Musa",
          department: "General Medicine",
          qualification: "MBBS, FMCP",
          licenseNumber: "MDCN-12345",
        },
      },
    },
  });

  // ─── 3. NURSE ─────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "nurse@sprms.com",
      password: passwordHashes.NURSE,
      role: "NURSE",
      isActive: true,
      mustChangePassword: false,
      staffProfile: {
        create: {
          firstName: "Fatima",
          lastName: "Abdullahi",
          department: "General Ward",
          qualification: "RN, BNSc",
        },
      },
    },
  });

  // ─── 4. RECEPTIONIST ──────────────────────────────────────────────────────
  const receptionist = await prisma.user.create({
    data: {
      email: "reception@sprms.com",
      password: passwordHashes.RECEPTIONIST,
      role: "RECEPTIONIST",
      isActive: true,
      mustChangePassword: false,
      staffProfile: {
        create: {
          firstName: "Hauwa",
          lastName: "Ibrahim",
          department: "Front Desk",
        },
      },
    },
  });

  // ─── 5. PHARMACIST ────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "pharmacy@sprms.com",
      password: passwordHashes.PHARMACIST,
      role: "PHARMACIST",
      isActive: true,
      mustChangePassword: false,
      staffProfile: {
        create: {
          firstName: "Yusuf",
          lastName: "Sani",
          department: "Pharmacy",
          qualification: "B.Pharm",
          licenseNumber: "PCN-67890",
        },
      },
    },
  });

  // ─── 6. PATIENT USER ──────────────────────────────────────────────────────
  const patientUser = await prisma.user.create({
    data: {
      email: "patient@sprms.com",
      password: passwordHashes.PATIENT,
      role: "PATIENT",
      isActive: true,
      mustChangePassword: false,
    },
  });

  // ─── 7. SAMPLE PATIENTS ───────────────────────────────────────────────────
  const patient1 = await prisma.patient.create({
    data: {
      patientNumber: "PAT-2024-0001",
      userId: patientUser.id,
      firstName: "Aisha",
      lastName: "Bello",
      dateOfBirth: new Date("1990-05-15"),
      gender: "FEMALE",
      bloodGroup: "O_POSITIVE",
      phone: "08012345678",
      email: "patient@sprms.com",
      address: "12 Ahmadu Bello Way",
      city: "Zaria",
      state: "Kaduna",
      nationality: "Nigerian",
      emergencyName: "Musa Bello",
      emergencyPhone: "08098765432",
      emergencyRelation: "Spouse",
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      patientNumber: "PAT-2024-0002",
      firstName: "Chukwu",
      lastName: "Okafor",
      dateOfBirth: new Date("1975-11-22"),
      gender: "MALE",
      bloodGroup: "A_POSITIVE",
      phone: "08023456789",
      email: "chukwu.okafor@email.com",
      address: "45 Sokoto Road",
      city: "Kaduna",
      state: "Kaduna",
      nationality: "Nigerian",
    },
  });

  await prisma.patient.create({
    data: {
      patientNumber: "PAT-2024-0003",
      firstName: "Ngozi",
      lastName: "Adeyemi",
      dateOfBirth: new Date("2000-03-08"),
      gender: "FEMALE",
      bloodGroup: "B_POSITIVE",
      phone: "08034567890",
      city: "Zaria",
      state: "Kaduna",
      nationality: "Nigerian",
    },
  });

  // ─── 8. SAMPLE APPOINTMENTS ───────────────────────────────────────────────
  // FIX: Added endTime (scheduledAt + 30 minutes) — required by schema

  const appt1Start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appt1End = new Date(appt1Start.getTime() + 30 * 60 * 1000);

  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor.id,
      createdById: receptionist.id,
      scheduledAt: appt1Start,
      endTime: appt1End, // ← FIXED: was missing
      status: "CONFIRMED",
      reason: "General checkup",
    },
  });

  const appt2Start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const appt2End = new Date(appt2Start.getTime() + 30 * 60 * 1000);

  await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor.id,
      createdById: receptionist.id,
      scheduledAt: appt2Start,
      endTime: appt2End, // ← FIXED: was missing
      status: "SCHEDULED",
      reason: "Follow-up consultation",
    },
  });

  // ─── 9. SEED COMPLETE ─────────────────────────────────────────────────────
  console.log("✅ Seeding complete!");
  console.log("\n📋 Test Accounts:");
  console.log("─────────────────────────────────────────");
  console.log(
    "Demo passwords were read from SPRMS_SEED_<ROLE>_PASSWORD variables.",
  );
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
