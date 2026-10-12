import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPatient = session.user.role === Role.PATIENT;
  const patient = isPatient
    ? await prisma.patient.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
        },
      })
    : null;

  return NextResponse.json({ isPatient, patient });
}
