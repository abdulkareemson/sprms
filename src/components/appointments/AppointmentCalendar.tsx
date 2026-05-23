// src/components/appointments/AppointmentCalendar.tsx

"use client";

import { useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/hooks/useAppointments";
import type { AppointmentStatus } from "@/schemas/appointment.schema";

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_DOT: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-500",
  CONFIRMED: "bg-emerald-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-slate-400",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-orange-500",
};

const STATUS_PILL: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-600 line-through opacity-60",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

function getDoctorName(doctor: Appointment["doctor"]): string {
  if (doctor.staffProfile) {
    return `${doctor.staffProfile.firstName} ${doctor.staffProfile.lastName}`;
  }
  return doctor.email;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AppointmentCalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  view: "week" | "day";
  onDateChange: (date: Date) => void;
  onViewChange: (view: "week" | "day") => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AppointmentCalendar({
  appointments,
  selectedDate,
  view,
  onDateChange,
  onViewChange,
  onAppointmentClick,
}: AppointmentCalendarProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Hours displayed: 7 am – 6 pm
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  // Group appointments by date key
  const apptByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const key = format(parseISO(a.scheduledAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [appointments]);

  const navigate = (dir: -1 | 1) => {
    onDateChange(addDays(selectedDate, dir * (view === "week" ? 7 : 1)));
  };

  const getSlotAppointments = (day: Date, hour: number): Appointment[] => {
    const key = format(day, "yyyy-MM-dd");
    const dayAppts = apptByDate.get(key) ?? [];
    return dayAppts.filter((a) => parseISO(a.scheduledAt).getHours() === hour);
  };

  const daysToShow = view === "week" ? weekDays : [selectedDate];

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h2 className="text-base font-semibold text-slate-800 min-w-[220px] text-center">
            {view === "week"
              ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
              : format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h2>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(new Date())}
            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            Today
          </Button>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                view === v
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v === "week" ? "Week" : "Day"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Day headers */}
        <div
          className="grid sticky top-0 z-10 bg-white border-b border-slate-200"
          style={{
            gridTemplateColumns: `64px repeat(${daysToShow.length}, 1fr)`,
          }}
        >
          <div className="p-2 border-r border-slate-100" />
          {daysToShow.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const count = apptByDate.get(dayKey)?.length ?? 0;
            return (
              <button
                key={dayKey}
                onClick={() => onDateChange(day)}
                className={`p-3 text-center border-r border-slate-100 last:border-r-0 hover:bg-slate-50 transition-colors ${
                  isSameDay(day, selectedDate) && view === "day"
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {format(day, "EEE")}
                </p>
                <div
                  className={`mx-auto mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isToday(day)
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {format(day, "d")}
                </div>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="mt-1 text-xs h-4 px-1.5"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Hour rows */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="grid border-b border-slate-100 last:border-b-0 min-h-[72px]"
            style={{
              gridTemplateColumns: `64px repeat(${daysToShow.length}, 1fr)`,
            }}
          >
            {/* Time label */}
            <div className="p-2 border-r border-slate-100 flex items-start justify-end pr-3 pt-2">
              <span className="text-xs text-slate-400 font-medium">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </span>
            </div>

            {/* Day cells */}
            {daysToShow.map((day) => {
              const slotAppts = getSlotAppointments(day, hour);
              const dayKey = format(day, "yyyy-MM-dd");
              return (
                <div
                  key={`${dayKey}-${hour}`}
                  className="border-r border-slate-100 last:border-r-0 p-1 space-y-1"
                >
                  {slotAppts.map((appt) => {
                    const start = parseISO(appt.scheduledAt);
                    const end = parseISO(appt.endTime);
                    return (
                      <button
                        key={appt.id}
                        onClick={() => onAppointmentClick(appt)}
                        className={`w-full text-left rounded-lg px-2 py-1.5 text-xs transition-all hover:ring-2 hover:ring-blue-300 hover:shadow-md active:scale-95 ${STATUS_PILL[appt.status]}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[appt.status]}`}
                          />
                          <span className="font-semibold truncate">
                            {format(start, "h:mm")}–{format(end, "h:mm a")}
                          </span>
                        </div>
                        <p className="truncate font-medium leading-tight">
                          {appt.patient.firstName} {appt.patient.lastName}
                        </p>
                        <p className="truncate text-[10px] opacity-75">
                          Dr. {getDoctorName(appt.doctor)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
