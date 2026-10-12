import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await prisma.user.findMany({
    where: { role: Role.DOCTOR, isActive: true },
    select: {
      id: true,
      email: true,
      staffProfile: {
        select: {
          firstName: true,
          lastName: true,
          specialization: true,
          department: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ doctors });
}
