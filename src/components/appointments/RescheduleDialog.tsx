"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, Loader2 } from "lucide-react";
import type { Appointment } from "@/hooks/useAppointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RescheduleDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const;

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!appointment || !open) return;
    const scheduledAt = parseISO(appointment.scheduledAt);
    setDate(format(scheduledAt, "yyyy-MM-dd"));
    setTime(format(scheduledAt, "HH:mm"));
    setDuration(String(appointment.durationMinutes));
    setError("");
  }, [appointment, open]);

  const submitReschedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!appointment) return;

    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentDate: date,
          startTime: time,
          duration: Number(duration),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not reschedule this appointment.");
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Reschedule appointment
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `Update the appointment for ${appointment.patient.firstName} ${appointment.patient.lastName}.`
              : "Choose a new appointment time."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submitReschedule} className="space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input
                id="reschedule-date"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-time">New time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger disabled={isSubmitting}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Keep current time
            </Button>
            <Button type="submit" disabled={isSubmitting || !date || !time}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save new time"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
