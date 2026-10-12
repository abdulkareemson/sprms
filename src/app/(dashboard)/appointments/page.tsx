// src/app/(dashboard)/appointments/page.tsx

"use client";

import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  List,
  RefreshCw,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { CancelDialog } from "@/components/appointments/CancelDialog";
import { RescheduleDialog } from "@/components/appointments/RescheduleDialog";
import { useAppointments } from "@/hooks/useAppointments";
import { useAppStore } from "@/store/appStore";
import { usePermission } from "@/hooks/usePermission";
import type { Appointment } from "@/hooks/useAppointments";
import type { AppointmentStatus } from "@/schemas/appointment.schema";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function AppointmentSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 animate-pulse border border-slate-200"
        />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekBounds(date: Date): { from: string; to: string } {
  const d = new Date(date);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: format(mon, "yyyy-MM-dd"), to: format(sun, "yyyy-MM-dd") };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { data: session } = useSession();
  const { calendarView, setCalendarView, selectedDate, setSelectedDate } =
    useAppStore();
  const { hasPermission } = usePermission();
  const canManage = hasPermission("manage_appointments");
  const isDoctor = session?.user?.role === "DOCTOR";
  const isPatient = session?.user?.role === "PATIENT";
  const canActOnAppointments = canManage && !isPatient;

  const [displayMode, setDisplayMode] = useState<"calendar" | "list">(
    "calendar",
  );
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    appointment?: Appointment;
    intent: "cancel" | "reject";
  }>({ open: false, intent: "cancel" });
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isDoctor) {
      setDisplayMode("list");
      setStatusFilter("SCHEDULED");
    }
  }, [isDoctor]);

  // Build fetch params
  const fetchParams =
    displayMode === "calendar"
      ? calendarView === "day"
        ? { date: format(selectedDate, "yyyy-MM-dd") }
        : getWeekBounds(selectedDate)
      : {};

  const { appointments, isLoading, error, refetch } = useAppointments({
    ...fetchParams,
    status:
      statusFilter !== "all" ? (statusFilter as AppointmentStatus) : undefined,
    limit: 100,
  });

  // Filter for list view search
  const filtered = appointments.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const doctorName = a.doctor.staffProfile
      ? `${a.doctor.staffProfile.firstName} ${a.doctor.staffProfile.lastName}`
      : a.doctor.email;
    return (
      `${a.patient.firstName} ${a.patient.lastName}`
        .toLowerCase()
        .includes(q) ||
      a.patient.patientNumber.toLowerCase().includes(q) ||
      doctorName.toLowerCase().includes(q) ||
      (a.reason ?? "").toLowerCase().includes(q)
    );
  });

  // Status change
  const handleStatusChange = useCallback(
    async (id: string, status: AppointmentStatus, reason?: string) => {
      const body: Record<string, unknown> = { status };
      if (status === "CANCELLED")
        body.cancellationReason = reason ?? "Cancelled by staff";
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Appointment update failed");
      refetch();
    },
    [refetch],
  );

  const openCancelDialog = (
    appt: Appointment,
    intent: "cancel" | "reject" = "cancel",
  ) => setCancelDialog({ open: true, appointment: appt, intent });
  const handleCancelConfirm = async (reason: string) => {
    if (!cancelDialog.appointment) return;
    const cancellationReason =
      cancelDialog.intent === "reject"
        ? `Rejected by doctor: ${reason}`
        : reason;
    await handleStatusChange(
      cancelDialog.appointment.id,
      "CANCELLED",
      cancellationReason,
    );
    toast.success(
      cancelDialog.intent === "reject"
        ? "Appointment request rejected"
        : "Appointment cancelled",
    );
  };

  const handleApptClick = (appointment: Appointment) => {
    if (
      canActOnAppointments &&
      (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED")
    ) {
      setRescheduleAppointment(appointment);
      return;
    }
    setDisplayMode("list");
  };

  const roleDescription = isDoctor
    ? "Review appointment requests, confirm visits, and manage your schedule."
    : isPatient
      ? "Book appointments and follow their status."
      : "Schedule and manage patient appointments.";
  const bookingLabel = isPatient
    ? "Request Appointment"
    : isDoctor
      ? "Schedule for Patient"
      : "Book Appointment";

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <PageHeader
        title={isDoctor ? "My Appointments" : "Appointments"}
        description={roleDescription}
        action={
          canManage ? (
            <Button
              onClick={() => setShowBookingDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-200 gap-2"
            >
              <Plus className="h-4 w-4" />
              {bookingLabel}
            </Button>
          ) : undefined
        }
      />

      {/* Controls */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {displayMode === "list" && (
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="SCHEDULED">
                  {isDoctor ? "Awaiting confirmation" : "Scheduled"}
                </SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1 ml-auto">
            {(["calendar", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  displayMode === mode
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {mode === "calendar" ? (
                  <>
                    <Calendar className="h-3.5 w-3.5" /> Calendar
                  </>
                ) : (
                  <>
                    <List className="h-3.5 w-3.5" /> List
                  </>
                )}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={refetch}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 pb-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {displayMode === "calendar" && (
          <div className="h-[calc(100vh-220px)] min-h-[500px]">
            <AppointmentCalendar
              appointments={appointments}
              selectedDate={selectedDate}
              view={calendarView}
              onDateChange={setSelectedDate}
              onViewChange={setCalendarView}
              onAppointmentClick={handleApptClick}
            />
          </div>
        )}

        {displayMode === "list" && (
          <>
            {isLoading ? (
              <AppointmentSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={
                  isDoctor && statusFilter === "SCHEDULED"
                    ? "No appointment requests"
                    : "No appointments found"
                }
                description={
                  searchQuery
                    ? "No appointments match your search."
                    : "No appointments scheduled yet."
                }
                actionLabel={canManage ? bookingLabel : undefined}
                onAction={
                  canManage ? () => setShowBookingDialog(true) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {filtered.length}
                    </span>{" "}
                    appointment{filtered.length !== 1 ? "s" : ""}
                  </p>
                  {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                </div>

                {filtered.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    showPatient
                    showDoctor
                    canManage={canActOnAppointments}
                    isDoctor={isDoctor}
                    onStatusChange={async (id, status) => {
                      if (status === "CANCELLED") {
                        openCancelDialog(
                          appt,
                          isDoctor && appt.status === "SCHEDULED"
                            ? "reject"
                            : "cancel",
                        );
                      } else {
                        try {
                          await handleStatusChange(id, status);
                          toast.success(
                            `Appointment marked ${status.toLowerCase().replaceAll("_", " ")}`,
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Appointment update failed",
                          );
                        }
                      }
                    }}
                    onReschedule={
                      canActOnAppointments
                        ? setRescheduleAppointment
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md shadow-blue-200">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl">{bookingLabel}</DialogTitle>
            </div>
          </DialogHeader>
          <AppointmentForm
            defaultDate={selectedDate}
            onSuccess={() => {
              setShowBookingDialog(false);
              refetch();
            }}
            onCancel={() => setShowBookingDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <CancelDialog
        open={cancelDialog.open}
        intent={cancelDialog.intent}
        onOpenChange={(open) =>
          setCancelDialog((current) => ({ ...current, open }))
        }
        appointmentInfo={
          cancelDialog.appointment
            ? `${cancelDialog.appointment.patient.firstName} ${cancelDialog.appointment.patient.lastName} — ${format(new Date(cancelDialog.appointment.scheduledAt), "MMM d, yyyy h:mm a")}`
            : undefined
        }
        onConfirm={handleCancelConfirm}
      />

      <RescheduleDialog
        appointment={rescheduleAppointment}
        open={rescheduleAppointment !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleAppointment(null);
        }}
        onSuccess={() => {
          setRescheduleAppointment(null);
          refetch();
          toast.success("Appointment rescheduled");
        }}
      />
    </div>
  );
}
