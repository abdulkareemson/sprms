-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'LAB_TEST', 'IMAGING', 'VACCINATION', 'EMERGENCY');

-- AlterTable: add endTime as nullable first, backfill, then set NOT NULL
ALTER TABLE "appointments" ADD COLUMN "endTime" TIMESTAMP(3);
UPDATE "appointments" SET "endTime" = "scheduledAt" + INTERVAL '30 minutes';
ALTER TABLE "appointments" ALTER COLUMN "endTime" SET NOT NULL;

-- AlterTable: add type with default
ALTER TABLE "appointments" ADD COLUMN "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION';

-- AlterTable: add specialization to staff_profiles
ALTER TABLE "staff_profiles" ADD COLUMN IF NOT EXISTS "specialization" TEXT;