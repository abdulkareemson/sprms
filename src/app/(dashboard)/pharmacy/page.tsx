// src/app/(dashboard)/pharmacy/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  RefreshCcw,
  TrendingUp,
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
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PrescriptionCard } from "@/components/pharmacy/PrescriptionCard";
import { DispenseDialog } from "@/components/pharmacy/DispenseDialog";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { usePermission } from "@/hooks/usePermission";
import type { Prescription } from "@/hooks/usePrescriptions";
import type { DispenseStatus } from "@/schemas/prescription.schema";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PrescriptionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-48 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 animate-pulse border border-slate-200"
        />
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg} flex items-center gap-3`}>
      <div className={`p-2.5 rounded-lg bg-white shadow-sm`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PharmacyPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canDispense = hasPermission("dispense_medication");

  const [dispenseDialog, setDispenseDialog] = useState<{
    open: boolean;
    prescription?: Prescription;
  }>({ open: false });
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { prescriptions, total, isLoading, error, refetch } = usePrescriptions({
    dispenseStatus:
      statusFilter !== "all" ? (statusFilter as DispenseStatus) : undefined,
    page,
    limit: 20,
  });

  // ── Stats (from all prescriptions unfiltered) ─────────────────────────────
  const { prescriptions: allRx } = usePrescriptions({ limit: 200 });
  const stats = {
    pending: allRx.filter((p) => p.dispenseStatus === "PENDING").length,
    partial: allRx.filter((p) => p.dispenseStatus === "PARTIALLY_DISPENSED")
      .length,
    dispensed: allRx.filter((p) => p.dispenseStatus === "DISPENSED").length,
    total: allRx.length,
  };

  // ── Filter by search ──────────────────────────────────────────────────────
  const filtered = prescriptions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.medicationName.toLowerCase().includes(q) ||
      `${p.patient.firstName} ${p.patient.lastName}`
        .toLowerCase()
        .includes(q) ||
      p.patient.patientNumber.toLowerCase().includes(q)
    );
  });

  // ── Dispense handler ──────────────────────────────────────────────────────
  const handleDispense = async (
    id: string,
    status: DispenseStatus,
    notes?: string,
  ) => {
    const res = await fetch(`/api/prescriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispenseStatus: status, dispensingNotes: notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to update");
    refetch();
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Pharmacy"
        description="View and dispense patient prescriptions"
      />

      <div className="px-4 sm:px-6 pb-6 space-y-6">
        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50 border-amber-200"
          />
          <StatCard
            label="Partial"
            value={stats.partial}
            icon={RefreshCw}
            color="text-blue-600"
            bg="bg-blue-50 border-blue-200"
          />
          <StatCard
            label="Dispensed"
            value={stats.dispensed}
            icon={CheckCircle}
            color="text-emerald-600"
            bg="bg-emerald-50 border-emerald-200"
          />
          <StatCard
            label="Total"
            value={stats.total}
            icon={TrendingUp}
            color="text-purple-600"
            bg="bg-purple-50 border-purple-200"
          />
        </div>

        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by medication or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All prescriptions</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIALLY_DISPENSED">Partial</SelectItem>
                <SelectItem value="DISPENSED">Dispensed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={refetch}
            disabled={isLoading}
            className="h-9 w-9 ml-auto"
          >
            <RefreshCcw
              className={`h-4 w-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <PrescriptionSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Pill}
            title={
              statusFilter === "PENDING"
                ? "No pending prescriptions"
                : "No prescriptions found"
            }
            description={
              searchQuery
                ? "No prescriptions match your search."
                : statusFilter === "PENDING"
                  ? "All prescriptions have been dispensed."
                  : "No prescriptions in this category."
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filtered.length}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{total}</span>{" "}
                prescription{total !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-3">
              {filtered.map((rx) => (
                <PrescriptionCard
                  key={rx.id}
                  prescription={rx}
                  canDispense={canDispense}
                  showPatient
                  onDispense={(p: Prescription) =>
                    setDispenseDialog({ open: true, prescription: p })
                  }
                  onViewRecord={(recordId: string) =>
                    router.push(`/patients/${rx.patientId}/records/${recordId}`)
                  }
                />
              ))}
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600 px-3">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Dispense Dialog ───────────────────────────────────────────────── */}
      <DispenseDialog
        open={dispenseDialog.open}
        onOpenChange={(open) => setDispenseDialog({ open })}
        prescription={dispenseDialog.prescription ?? null}
        onConfirm={handleDispense}
      />
    </div>
  );
}
