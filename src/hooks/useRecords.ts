//src/hooks/useRecords.ts

"use client";

import { useState, useCallback, useEffect } from "react";

interface RecordCreator {
  staffProfile: { firstName: string; lastName: string } | null;
}

interface MedicalRecord {
  id: string;
  recordNumber: string;
  patientId: string;
  recordType: string;
  title: string;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  icdCode: string | null;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: RecordCreator;
  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  vitalSigns: Array<{
    temperature: number | null;
    systolicBP: number | null;
    diastolicBP: number | null;
    heartRate: number | null;
    oxygenSaturation: number | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
    recordedAt: string;
  }>;
  _count: {
    prescriptions: number;
    documents: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useRecords(patientId?: string) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [recordType, setRecordType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(patientId && { patientId }),
        ...(recordType && { recordType }),
      });

      const response = await fetch(`/api/records?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch records");
      }

      setRecords(data.records);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch records");
    } finally {
      setIsLoading(false);
    }
  }, [patientId, recordType, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [recordType]);

  return {
    records,
    pagination,
    recordType,
    setRecordType,
    page,
    setPage,
    isLoading,
    error,
    refetch: fetchRecords,
  };
}

export type { MedicalRecord };
