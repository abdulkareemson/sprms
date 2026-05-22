import { prisma } from "@/lib/prisma";

/**
 * Generates a unique Patient Number: PAT-YYYY-XXXX
 */
export async function generatePatientNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Count all patients ever created (including inactive)
  const count = await prisma.patient.count();
  const sequence = String(count + 1).padStart(4, "0");

  return `PAT-${year}-${sequence}`;
}

/**
 * Generates a unique Record Number: REC-YYYY-XXXX
 */
export async function generateRecordNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const count = await prisma.medicalRecord.count();
  const sequence = String(count + 1).padStart(4, "0");

  return `REC-${year}-${sequence}`;
}

/**
 * Generates a unique Invoice Number: INV-YYYY-XXXX
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const count = await prisma.invoice.count();
  const sequence = String(count + 1).padStart(4, "0");

  return `INV-${year}-${sequence}`;
}
