// src/hooks/useAppointments.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AppointmentStatus,
  AppointmentType,
} from "@/schemas/appointment.schema";

// ── Shared types ──────────────────────────────────────────────────────────────
export interface AppointmentDoctor {
  id: string;
  email: string;
  staffProfile: {
    firstName: string;
    lastName: string;
    specialization: string | null;
    department: string | null;
  } | null;
}

export interface AppointmentPatient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  endTime: string;
  durationMinutes: number;
  type: AppointmentType;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  cancelReason: string | null;
  createdAt: string;
  patient: AppointmentPatient;
  doctor: AppointmentDoctor;
}

// ── Hook options ──────────────────────────────────────────────────────────────
interface UseAppointmentsOptions {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseAppointmentsReturn {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAppointments(
  options: UseAppointmentsOptions = {},
): UseAppointmentsReturn {
  const {
    patientId,
    doctorId,
    status,
    type,
    date,
    from,
    to,
    page = 1,
    limit = 20,
    autoFetch = true,
  } = options;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (patientId) params.set("patientId", patientId);
      if (doctorId) params.set("doctorId", doctorId);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (date) params.set("date", date);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error ?? "Failed to fetch appointments");

      setAppointments(data.appointments ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [patientId, doctorId, status, type, date, from, to, page, limit]);

  useEffect(() => {
    if (autoFetch) fetchAppointments();
  }, [fetchAppointments, autoFetch]);

  return {
    appointments,
    total,
    page,
    limit,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
}
