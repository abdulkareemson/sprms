//src/app/(dashboard)/page.tsx

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { Users, Calendar, FileText, Receipt, Clock, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color = "blue",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  color?: "blue" | "green" | "orange" | "purple";
}) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
            {description && (
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role-specific dashboard data fetching ────────────────────────────────────

async function getAdminStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients,
    todayAppointments,
    totalRecords,
    pendingInvoices,
    recentPatients,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.patient.count({ where: { isActive: true } }),
    prisma.appointment.count({
      where: {
        scheduledAt: { gte: today, lt: tomorrow },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    }),
    prisma.medicalRecord.count(),
    prisma.invoice.count({ where: { paymentStatus: "PENDING" } }),
    prisma.patient.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        createdAt: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: today },
        status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientNumber: true },
        },
        doctor: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  return {
    totalPatients,
    todayAppointments,
    totalRecords,
    pendingInvoices,
    recentPatients,
    upcomingAppointments,
  };
}

async function getDoctorStats(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [myTodayAppointments, myTotalRecords, upcomingAppointments] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          doctorId: userId,
          scheduledAt: { gte: today, lt: tomorrow },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      }),
      prisma.medicalRecord.count({ where: { createdById: userId } }),
      prisma.appointment.findMany({
        where: {
          doctorId: userId,
          scheduledAt: { gte: today },
          status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: {
          patient: {
            select: { firstName: true, lastName: true, patientNumber: true },
          },
        },
      }),
    ]);

  return { myTodayAppointments, myTotalRecords, upcomingAppointments };
}

async function getPharmacistStats() {
  const pendingPrescriptions = await prisma.prescription.count({
    where: { dispenseStatus: "PENDING" },
  });
  return { pendingPrescriptions };
}

async function getPatientStats(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!patient) return null;

  const [upcomingAppointments, totalRecords, pendingInvoices] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          scheduledAt: { gte: new Date() },
          status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        include: {
          doctor: {
            select: {
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.medicalRecord.count({ where: { patientId: patient.id } }),
      prisma.invoice.count({
        where: { patientId: patient.id, paymentStatus: "PENDING" },
      }),
    ]);

  return { upcomingAppointments, totalRecords, pendingInvoices, patient };
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    IN_PROGRESS: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const userId = session.user.id;
  const name = session.user.name ?? "User";

  // ── ADMIN DASHBOARD ───────────────────────────────────────────────────────
  if (role === Role.ADMIN) {
    const stats = await getAdminStats();

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here is what is happening in SPRMS today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={Users}
            description="Active patients"
            color="blue"
          />
          <StatsCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon={Calendar}
            description="Scheduled for today"
            color="green"
          />
          <StatsCard
            title="Medical Records"
            value={stats.totalRecords}
            icon={FileText}
            description="Total records"
            color="purple"
          />
          <StatsCard
            title="Pending Invoices"
            value={stats.pendingInvoices}
            icon={Receipt}
            description="Awaiting payment"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Patients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-700">
                Recently Registered Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentPatients.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No patients yet
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recentPatients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.patientNumber}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {p.gender}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-700">
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingAppointments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(
                            new Date(apt.scheduledAt),
                            "MMM d, yyyy — h:mm a",
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          Dr. {apt.doctor.staffProfile?.firstName}{" "}
                          {apt.doctor.staffProfile?.lastName}
                        </p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── DOCTOR DASHBOARD ──────────────────────────────────────────────────────
  if (role === Role.DOCTOR) {
    const stats = await getDoctorStats(userId);

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Good day, Dr. {name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatsCard
            title="Today's Appointments"
            value={stats.myTodayAppointments}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Records Created"
            value={stats.myTotalRecords}
            icon={FileText}
            color="green"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">
              My Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingAppointments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {apt.patient.patientNumber} •{" "}
                        {format(new Date(apt.scheduledAt), "MMM d — h:mm a")}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── PHARMACIST DASHBOARD ──────────────────────────────────────────────────
  if (role === Role.PHARMACIST) {
    const stats = await getPharmacistStats();

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Pharmacy Dashboard 💊
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="Pending Prescriptions"
            value={stats.pendingPrescriptions}
            icon={Pill}
            description="Awaiting dispensing"
            color="orange"
          />
        </div>

        {stats.pendingPrescriptions > 0 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-slate-600 text-sm">
                You have{" "}
                <span className="font-bold text-orange-600">
                  {stats.pendingPrescriptions}
                </span>{" "}
                prescription(s) waiting to be dispensed.
              </p>
              <a
                href="/pharmacy"
                className="inline-block mt-3 text-sm text-blue-600 hover:underline font-medium"
              >
                Go to Pharmacy →
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── PATIENT DASHBOARD ─────────────────────────────────────────────────────
  if (role === Role.PATIENT) {
    const stats = await getPatientStats(userId);

    if (!stats) {
      return (
        <div className="text-center py-16">
          <p className="text-slate-500">
            Your patient profile is being set up. Please contact the clinic.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome, {name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your health portal — view your records, appointments, and invoices.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Upcoming Appointments"
            value={stats.upcomingAppointments.length}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Medical Records"
            value={stats.totalRecords}
            icon={FileText}
            color="green"
          />
          <StatsCard
            title="Pending Invoices"
            value={stats.pendingInvoices}
            icon={Receipt}
            color="orange"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingAppointments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        Dr. {apt.doctor.staffProfile?.firstName}{" "}
                        {apt.doctor.staffProfile?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(
                          new Date(apt.scheduledAt),
                          "EEEE, MMM d — h:mm a",
                        )}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── NURSE / RECEPTIONIST DASHBOARD ───────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: today, lt: tomorrow },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
    include: {
      patient: {
        select: { firstName: true, lastName: true, patientNumber: true },
      },
      doctor: {
        select: {
          staffProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const roleLabel = role === Role.NURSE ? "Nurse" : "Receptionist";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome, {name.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {roleLabel} Dashboard — {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          color="blue"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-700">
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              No appointments scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {apt.patient.patientNumber} •{" "}
                      {format(new Date(apt.scheduledAt), "h:mm a")} • Dr.{" "}
                      {apt.doctor.staffProfile?.firstName}{" "}
                      {apt.doctor.staffProfile?.lastName}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
