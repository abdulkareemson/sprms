// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data ───────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.patientDocument.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password@123", 12);

  // ─── 1. ADMIN ─────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "admin@sprms.com",
      password: passwordHash,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
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
      password: passwordHash,
      role: "DOCTOR",
      isActive: true,
      isEmailVerified: true,
      mustChangePassword: true,
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
      password: passwordHash,
      role: "NURSE",
      isActive: true,
      isEmailVerified: true,
      mustChangePassword: true,
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
      password: passwordHash,
      role: "RECEPTIONIST",
      isActive: true,
      isEmailVerified: true,
      mustChangePassword: true,
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
      password: passwordHash,
      role: "PHARMACIST",
      isActive: true,
      isEmailVerified: true,
      mustChangePassword: true,
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
      password: passwordHash,
      role: "PATIENT",
      isActive: true,
      isEmailVerified: true,
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
  console.log("ADMIN        : admin@sprms.com       / Password@123");
  console.log("DOCTOR       : doctor@sprms.com      / Password@123");
  console.log("NURSE        : nurse@sprms.com       / Password@123");
  console.log("RECEPTIONIST : reception@sprms.com   / Password@123");
  console.log("PHARMACIST   : pharmacy@sprms.com    / Password@123");
  console.log("PATIENT      : patient@sprms.com     / Password@123");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
