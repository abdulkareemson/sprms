import { loadEnvConfig } from "@next/env";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const demoAccounts = [
  {
    role: Role.ADMIN,
    email: "admin@sprms.com",
    env: "SPRMS_SEED_ADMIN_PASSWORD",
  },
  {
    role: Role.PATIENT,
    email: "patient@sprms.com",
    env: "SPRMS_SEED_PATIENT_PASSWORD",
  },
  {
    role: Role.DOCTOR,
    email: "doctor@sprms.com",
    env: "SPRMS_SEED_DOCTOR_PASSWORD",
  },
  {
    role: Role.NURSE,
    email: "nurse@sprms.com",
    env: "SPRMS_SEED_NURSE_PASSWORD",
  },
  {
    role: Role.PHARMACIST,
    email: "pharmacy@sprms.com",
    env: "SPRMS_SEED_PHARMACIST_PASSWORD",
  },
  {
    role: Role.RECEPTIONIST,
    email: "reception@sprms.com",
    env: "SPRMS_SEED_RECEPTIONIST_PASSWORD",
  },
] as const;

function getPasswords(): string[] {
  const passwords = demoAccounts.map(({ env }) => process.env[env] ?? "");
  const valid = passwords.every(
    (password) =>
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
  );

  if (!valid) {
    throw new Error(
      "Set a strong password for all six demo roles in the SPRMS_SEED_<ROLE>_PASSWORD environment variables.",
    );
  }

  return passwords;
}

async function main() {
  const passwords = getPasswords();
  const accounts = await prisma.user.findMany({
    where: {
      OR: demoAccounts.map(({ role, email }) => ({ role, email })),
    },
    select: { role: true, email: true },
  });

  const missingAccounts = demoAccounts.filter(
    ({ role, email }) =>
      !accounts.some(
        (account) => account.role === role && account.email === email,
      ),
  );

  if (missingAccounts.length) {
    throw new Error(
      `Cannot rotate passwords; demo account(s) not found: ${missingAccounts.map(({ email }) => email).join(", ")}`,
    );
  }

  const updates = await Promise.all(
    demoAccounts.map(async ({ email }, index) => ({
      email,
      password: await bcrypt.hash(passwords[index], 12),
    })),
  );

  await prisma.$transaction(
    updates.map(({ email, password }) =>
      prisma.user.update({
        where: { email },
        data: {
          password,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mustChangePassword: false,
        },
      }),
    ),
  );

  console.log("Updated passwords for all six demo accounts.");
}

main()
  .catch((error) => {
    console.error("Demo password rotation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
