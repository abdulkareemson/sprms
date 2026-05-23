// src/components/dashboard/DashboardCharts.tsx

"use client";

import { useEffect, useState } from "react";
import {
  PatientTrendChart,
  AppointmentTrendChart,
  RecordTypeChart,
  RevenueTrendChart,
  AppointmentStatusChart,
} from "./Charts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStatsData {
  patientTrend: Array<{ month: string; patients: number }>;
  appointmentTrend: Array<{ week: string; appointments: number }>;
  recordTypeDistribution: Array<{ type: string; count: number }>;
  appointmentStatusDistribution: Array<{ status: string; count: number }>;
  revenueTrend: Array<{ month: string; revenue: number; paid: number }>;
}

interface DashboardChartsProps {
  role: "ADMIN" | "DOCTOR";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardCharts({ role }: DashboardChartsProps) {
  const [data, setData] = useState<DashboardStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (role === "ADMIN") {
    return (
      <div className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PatientTrendChart
            data={data?.patientTrend ?? []}
            isLoading={isLoading}
          />
          <AppointmentTrendChart
            data={data?.appointmentTrend ?? []}
            isLoading={isLoading}
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RecordTypeChart
            data={data?.recordTypeDistribution ?? []}
            isLoading={isLoading}
          />
          <AppointmentStatusChart
            data={data?.appointmentStatusDistribution ?? []}
            isLoading={isLoading}
          />
          <RevenueTrendChart
            data={data?.revenueTrend ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  // Doctor — fewer charts
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AppointmentTrendChart
        data={data?.appointmentTrend ?? []}
        isLoading={isLoading}
      />
      <RecordTypeChart
        data={data?.recordTypeDistribution ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
