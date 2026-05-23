// src/components/appointments/AppointmentForm.tsx

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAppointmentSchema,
  APPOINTMENT_TYPES,
  type CreateAppointmentInput,
} from "@/schemas/appointment.schema";

// ── Local types ───────────────────────────────────────────────────────────────
interface PatientOption {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
}

interface DoctorOption {
  id: string;
  email: string;
  staffProfile: {
    firstName: string;
    lastName: string;
    specialization: string | null;
    department: string | null;
  } | null;
}

interface AppointmentFormProps {
  defaultPatientId?: string;
  defaultDoctorId?: string;
  defaultDate?: Date;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  LAB_TEST: "Lab Test",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export function AppointmentForm({
  defaultPatientId,
  defaultDoctorId,
  defaultDate,
  onSuccess,
  onCancel,
}: AppointmentFormProps) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patientId: defaultPatientId ?? "",
      doctorId: defaultDoctorId ?? "",
      appointmentDate: defaultDate
        ? format(defaultDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      duration: 30,
      type: "CONSULTATION",
      reason: "",
      notes: "",
    },
  });

  const watchedType = watch("type");
  const watchedPatient = watch("patientId");
  const watchedDoctor = watch("doctorId");
  const watchedDuration = watch("duration");

  // ── Fetch patients + doctors ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoadingOptions(true);
      try {
        const [pRes, dRes] = await Promise.all([
          fetch("/api/patients?limit=200"),
          fetch("/api/staff?role=DOCTOR&limit=50"),
        ]);
        const pData = await pRes.json();
        const dData = await dRes.json();
        setPatients(pData.patients ?? []);
        setDoctors(dData.staff ?? []);
      } catch {
        setSubmitError("Failed to load form options. Please refresh.");
      } finally {
        setIsLoadingOptions(false);
      }
    };
    load();
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: CreateAppointmentInput) => {
    setSubmitError(null);
    setIsConflict(false);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setIsConflict(json.conflict === true);
        setSubmitError(json.error ?? "Failed to book appointment");
        return;
      }
      onSuccess?.();
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Loading form...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Error banner */}
      {submitError && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            isConflict
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">
              {isConflict ? "Schedule Conflict Detected" : "Booking Failed"}
            </p>
            <p className="text-sm mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* Patient + Doctor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <User className="h-3.5 w-3.5 text-blue-500" />
            Patient <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watchedPatient}
            onValueChange={(val) => setValue("patientId", val)}
            disabled={!!defaultPatientId}
          >
            <SelectTrigger className={errors.patientId ? "border-red-400" : ""}>
              <SelectValue placeholder="Select patient..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                  <span className="text-slate-400 ml-1 text-xs">
                    ({p.patientNumber})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.patientId && (
            <p className="text-xs text-red-500">{errors.patientId.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
            Doctor <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watchedDoctor}
            onValueChange={(val) => setValue("doctorId", val)}
            disabled={!!defaultDoctorId}
          >
            <SelectTrigger className={errors.doctorId ? "border-red-400" : ""}>
              <SelectValue placeholder="Select doctor..." />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => {
                const name = d.staffProfile
                  ? `${d.staffProfile.firstName} ${d.staffProfile.lastName}`
                  : d.email;
                const dept =
                  d.staffProfile?.specialization ?? d.staffProfile?.department;
                return (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {name}
                    {dept && (
                      <span className="text-slate-400 ml-1 text-xs">
                        — {dept}
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors.doctorId && (
            <p className="text-xs text-red-500">{errors.doctorId.message}</p>
          )}
        </div>
      </div>

      {/* Date + Time + Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            min={format(new Date(), "yyyy-MM-dd")}
            className={errors.appointmentDate ? "border-red-400" : ""}
            {...register("appointmentDate")}
          />
          {errors.appointmentDate && (
            <p className="text-xs text-red-500">
              {errors.appointmentDate.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            Start Time <span className="text-red-500">*</span>
          </Label>
          <Input
            type="time"
            className={errors.startTime ? "border-red-400" : ""}
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="text-xs text-red-500">{errors.startTime.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Duration
          </Label>
          <Select
            value={String(watchedDuration)}
            onValueChange={(val) => setValue("duration", Number(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          Appointment Type <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {APPOINTMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("type", t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                watchedType === t
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {errors.type && (
          <p className="text-xs text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          Reason for Visit <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="Brief description of the reason for this appointment..."
          className={errors.reason ? "border-red-400" : ""}
          {...register("reason")}
        />
        {errors.reason && (
          <p className="text-xs text-red-500">{errors.reason.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          Additional Notes{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Any additional information or special requirements..."
          className="resize-none"
          rows={3}
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-xs text-red-500">{errors.notes.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
