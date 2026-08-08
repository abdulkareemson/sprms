// src/app/(dashboard)/dashboard/page.tsx

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  Users,
  Calendar,
  FileText,
  Receipt,
  Clock,
  Pill,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-teal-100 text-teal-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

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
    recentAuditLogs,
    totalRevenue,
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
          select: {
            firstName: true,
            lastName: true,
            patientNumber: true,
          },
        },
        doctor: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        user: {
          select: {
            email: true,
            role: true,
            staffProfile: { select: { firstName: true, lastName: true } },
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.invoice.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    totalPatients,
    todayAppointments,
    totalRecords,
    pendingInvoices,
    recentPatients,
    upcomingAppointments,
    recentAuditLogs,
    totalRevenue: totalRevenue._sum.totalAmount ?? 0,
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
            select: {
              firstName: true,
              lastName: true,
              patientNumber: true,
            },
          },
        },
      }),
    ]);

  return { myTodayAppointments, myTotalRecords, upcomingAppointments };
}

async function getPharmacistStats() {
  const [pendingPrescriptions, dispensedToday] = await Promise.all([
    prisma.prescription.count({ where: { dispenseStatus: "PENDING" } }),
    prisma.prescription.count({
      where: {
        dispenseStatus: "DISPENSED",
        dispensedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return { pendingPrescriptions, dispensedToday };
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const userId = session.user.id;
  const name = session.user.name ?? "User";
  const firstName = name.split(" ")[0];

  // ── ADMIN ────────────────────────────────────────────────────────────────
  if (role === Role.ADMIN) {
    const stats = await getAdminStats();

    return (
      <div className="space-y-6">
        {/* Welcome */}
        <WelcomeBanner
          name={`Welcome back, ${firstName}`}
          subtitle={`${format(new Date(), "EEEE, MMMM d, yyyy")} — System Overview`}
          showStatus
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={Users}
            description="Active registered patients"
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
            description="All records in system"
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

        {/* Revenue Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">
                Total Revenue Collected
              </p>
              <p className="text-3xl font-bold mt-1">
                ₦
                {stats.totalRevenue.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                From all paid invoices
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-white/20" />
          </div>
        </div>

        {/* Charts */}
        <DashboardCharts role="ADMIN" />

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Patients */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Recently Registered Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentPatients.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  No patients yet
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.recentPatients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingAppointments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-start gap-3 py-1">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-emerald-600" />
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

  // ── DOCTOR ───────────────────────────────────────────────────────────────
  if (role === Role.DOCTOR) {
    const stats = await getDoctorStats(userId);

    return (
      <div className="space-y-6">
        <WelcomeBanner
          name={`Good day, Dr. ${firstName}`}
          subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="Today's Appointments"
            value={stats.myTodayAppointments}
            icon={Calendar}
            description="Patients to see today"
            color="blue"
          />
          <StatsCard
            title="Records Created"
            value={stats.myTotalRecords}
            icon={FileText}
            description="All time by you"
            color="green"
          />
        </div>

        {/* Doctor charts */}
        <DashboardCharts role="DOCTOR" />

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              My Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingAppointments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-2">
                {stats.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 py-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {apt.patient.patientNumber} ·{" "}
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

  // ── PHARMACIST ───────────────────────────────────────────────────────────
  if (role === Role.PHARMACIST) {
    const stats = await getPharmacistStats();

    return (
      <div className="space-y-6">
        <WelcomeBanner
          name={`Pharmacy Dashboard`}
          emoji="💊"
          subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="Pending Prescriptions"
            value={stats.pendingPrescriptions}
            icon={Pill}
            description="Awaiting dispensing"
            color="orange"
          />
          <StatsCard
            title="Dispensed Today"
            value={stats.dispensedToday}
            icon={Activity}
            description="Dispensed so far today"
            color="green"
          />
        </div>

        {stats.pendingPrescriptions > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Pill className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {stats.pendingPrescriptions} prescription
                  {stats.pendingPrescriptions !== 1 ? "s" : ""} awaiting
                  dispensing
                </p>
                <a
                  href="/pharmacy"
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium underline underline-offset-2"
                >
                  Go to Pharmacy →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PATIENT ──────────────────────────────────────────────────────────────
  if (role === Role.PATIENT) {
    const stats = await getPatientStats(userId);

    if (!stats) {
      return (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm">
            Your patient profile is being set up. Please contact the clinic.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <WelcomeBanner
          name={`Welcome, ${firstName}`}
          subtitle="Your personal health portal"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingAppointments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-2">
                {stats.upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 py-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-600" />
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

  // ── NURSE / RECEPTIONIST ─────────────────────────────────────────────────
  const today2 = new Date();
  today2.setHours(0, 0, 0, 0);
  const tomorrow2 = new Date(today2);
  tomorrow2.setDate(tomorrow2.getDate() + 1);

  const [todayAppointments, totalPatientsCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: today2, lt: tomorrow2 },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            patientNumber: true,
          },
        },
        doctor: {
          select: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.patient.count({ where: { isActive: true } }),
  ]);

  const roleLabel = role === Role.NURSE ? "Nurse" : "Receptionist";

  return (
    <div className="space-y-6">
      <WelcomeBanner
        name={`Welcome, ${firstName}`}
        subtitle={`${roleLabel} Dashboard — ${format(new Date(), "EEEE, MMMM d, yyyy")}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          description="Scheduled for today"
          color="blue"
        />
        <StatsCard
          title="Total Patients"
          value={totalPatientsCount}
          icon={Users}
          description="Active in system"
          color="green"
        />
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No appointments scheduled for today
            </p>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-start gap-3 py-1.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {apt.patient.patientNumber} ·{" "}
                      {format(new Date(apt.scheduledAt), "h:mm a")} · Dr.{" "}
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
