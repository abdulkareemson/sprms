// src/components/appointments/AppointmentCard.tsx

"use client";

import { useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Appointment } from "@/hooks/useAppointments";
import type { AppointmentStatus } from "@/schemas/appointment.schema";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDoctorName(doctor: Appointment["doctor"]): string {
  if (doctor.staffProfile) {
    return `${doctor.staffProfile.firstName} ${doctor.staffProfile.lastName}`;
  }
  return doctor.email;
}

// ── Config maps ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    icon: Calendar,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: PlayCircle,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    icon: XCircle,
  },
  NO_SHOW: {
    label: "No Show",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
    icon: AlertCircle,
  },
};

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  LAB_TEST: "Lab Test",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface AppointmentCardProps {
  appointment: Appointment;
  showPatient?: boolean;
  showDoctor?: boolean;
  canManage?: boolean;
  onStatusChange?: (
    id: string,
    status: AppointmentStatus,
    reason?: string,
  ) => void;
  onEdit?: (appointment: Appointment) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AppointmentCard({
  appointment,
  showPatient = true,
  showDoctor = true,
  canManage = false,
  onStatusChange,
  onEdit,
}: AppointmentCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const cfg = STATUS_CONFIG[appointment.status];
  const start = parseISO(appointment.scheduledAt);
  const end = parseISO(appointment.endTime);
  const isPastAppt = isPast(end);
  const doctorName = getDoctorName(appointment.doctor);

  const canTransitionTo = (s: AppointmentStatus) =>
    STATUS_TRANSITIONS[appointment.status]?.includes(s) ?? false;

  const handleStatusChange = async (
    newStatus: AppointmentStatus,
    reason?: string,
  ) => {
    if (!onStatusChange) return;
    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, newStatus, reason);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card
      className={`group relative overflow-hidden border-l-4 transition-all duration-200 hover:shadow-md ${cfg.border} hover:border-l-[6px]`}
    >
      <CardContent className="p-4 pl-5">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {/* Status pill */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>

            {/* Type */}
            <Badge variant="outline" className="text-xs font-normal">
              {TYPE_LABELS[appointment.type] ?? appointment.type}
            </Badge>

            {/* Past due */}
            {isPastAppt &&
              appointment.status !== "COMPLETED" &&
              appointment.status !== "CANCELLED" && (
                <Badge
                  variant="outline"
                  className="text-xs text-orange-600 border-orange-200 bg-orange-50"
                >
                  Past Due
                </Badge>
              )}
          </div>

          {/* Actions */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  disabled={isUpdating}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(appointment)}>
                      Edit appointment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canTransitionTo("CONFIRMED") && (
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("CONFIRMED")}
                    className="text-emerald-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Confirm
                  </DropdownMenuItem>
                )}
                {canTransitionTo("IN_PROGRESS") && (
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("IN_PROGRESS")}
                    className="text-amber-600"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" /> Start
                  </DropdownMenuItem>
                )}
                {canTransitionTo("COMPLETED") && (
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("COMPLETED")}
                    className="text-slate-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark Completed
                  </DropdownMenuItem>
                )}
                {canTransitionTo("NO_SHOW") && (
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("NO_SHOW")}
                    className="text-orange-600"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" /> Mark No-Show
                  </DropdownMenuItem>
                )}
                {canTransitionTo("CANCELLED") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        handleStatusChange("CANCELLED", "Cancelled by staff")
                      }
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Cancel
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Date / Time ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Calendar className="h-4 w-4 text-blue-500" />
            {format(start, "EEE, MMM d, yyyy")}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="h-4 w-4 text-slate-400" />
            {format(start, "h:mm a")} – {format(end, "h:mm a")}
            <span className="text-xs text-slate-400">
              ({appointment.durationMinutes} min)
            </span>
          </div>
        </div>

        {/* ── Reason ──────────────────────────────────────────────────────── */}
        {appointment.reason && (
          <p className="text-sm text-slate-700 mb-3 line-clamp-2 font-medium">
            {appointment.reason}
          </p>
        )}

        {/* ── People ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {showPatient && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 min-w-0">
              <div className="p-1 bg-blue-100 rounded-full shrink-0">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Patient</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </p>
                <p className="text-xs text-slate-400">
                  {appointment.patient.patientNumber}
                </p>
              </div>
              {appointment.patient.phone && (
                <a
                  href={`tel:${appointment.patient.phone}`}
                  className="ml-1 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Phone className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {showDoctor && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 min-w-0">
              <div className="p-1 bg-emerald-100 rounded-full shrink-0">
                <Stethoscope className="h-3 w-3 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Doctor</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  Dr. {doctorName}
                </p>
                {appointment.doctor.staffProfile?.specialization && (
                  <p className="text-xs text-slate-400 truncate">
                    {appointment.doctor.staffProfile.specialization}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Cancel reason ───────────────────────────────────────────────── */}
        {appointment.cancelReason && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs text-red-600">
              <span className="font-semibold">Cancellation reason: </span>
              {appointment.cancelReason}
            </p>
          </div>
        )}

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        {appointment.notes && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Notes: </span>
              {appointment.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
