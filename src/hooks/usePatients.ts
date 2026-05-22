//src/hooks/usePatients.ts

"use client";

import { useState, useCallback } from "react";
import { useDebounce } from "./useDebounce";
import { useEffect } from "react";

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    medicalRecords: number;
    appointments: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        limit: "10",
      });

      const response = await fetch(`/api/patients?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch patients");
      }

      setPatients(data.patients);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch patients");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return {
    patients,
    pagination,
    search,
    setSearch,
    page,
    setPage,
    isLoading,
    error,
    refetch: fetchPatients,
  };
}
