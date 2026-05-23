// src/hooks/usePrescriptions.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import type { DispenseStatus } from "@/schemas/prescription.schema";

// ── Shared types ──────────────────────────────────────────────────────────────
export interface PrescriptionDoctor {
  id: string;
  email: string;
  staffProfile: {
    firstName: string;
    lastName: string;
    specialization: string | null;
  } | null;
}

export interface PrescriptionPatient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface PrescriptionMedicalRecord {
  id: string;
  recordNumber: string;
  title: string;
  recordType: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  recordId: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string | null;
  dispenseStatus: DispenseStatus;
  dispensedAt: string | null;
  dispensingNotes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: PrescriptionPatient;
  prescribedBy: PrescriptionDoctor;
  medicalRecord: PrescriptionMedicalRecord | null;
}

// ── Hook options ──────────────────────────────────────────────────────────────
interface UsePrescriptionsOptions {
  patientId?: string;
  recordId?: string;
  dispenseStatus?: DispenseStatus;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UsePrescriptionsReturn {
  prescriptions: Prescription[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePrescriptions(
  options: UsePrescriptionsOptions = {},
): UsePrescriptionsReturn {
  const {
    patientId,
    recordId,
    dispenseStatus,
    page = 1,
    limit = 20,
    autoFetch = true,
  } = options;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (patientId) params.set("patientId", patientId);
      if (recordId) params.set("recordId", recordId);
      if (dispenseStatus) params.set("dispenseStatus", dispenseStatus);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/prescriptions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error ?? "Failed to fetch prescriptions");

      setPrescriptions(data.prescriptions ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [patientId, recordId, dispenseStatus, page, limit]);

  useEffect(() => {
    if (autoFetch) fetchPrescriptions();
  }, [fetchPrescriptions, autoFetch]);

  return {
    prescriptions,
    total,
    page,
    limit,
    isLoading,
    error,
    refetch: fetchPrescriptions,
  };
}
