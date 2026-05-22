//src/app/(dashboard)/patients/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePatients } from "@/hooks/usePatients";
import { usePermission } from "@/hooks/usePermission";
import { format, differenceInYears } from "date-fns";

// ── Local Patient type matching API response ───────────────────────────────────
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

export default function PatientsPage() {
  const router = useRouter();
  const canRegister = usePermission("register_patient");

  const {
    patients,
    pagination,
    search,
    setSearch,
    page,
    setPage,
    isLoading,
    error,
  } = usePatients();

  // Typed patients from hook — cast once here cleanly
  const typedPatients = patients as unknown as Patient[];

  const columns = [
    {
      key: "patientNumber",
      label: "Patient No.",
      render: (p: Patient) => (
        <span className="font-mono text-xs font-medium text-blue-700">
          {p.patientNumber}
        </span>
      ),
    },
    {
      key: "name",
      label: "Full Name",
      render: (p: Patient) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
            {p.firstName[0]}
            {p.lastName[0]}
          </div>
          <span className="font-medium text-slate-700">
            {p.firstName} {p.lastName}
          </span>
        </div>
      ),
    },
    {
      key: "age",
      label: "Age",
      render: (p: Patient) => {
        const age = differenceInYears(new Date(), new Date(p.dateOfBirth));
        return <span>{age} yrs</span>;
      },
    },
    {
      key: "gender",
      label: "Gender",
      render: (p: Patient) => (
        <Badge variant="outline" className="text-xs">
          {p.gender}
        </Badge>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (p: Patient) => (
        <span className="text-slate-500">{p.phone ?? "—"}</span>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (p: Patient) => (
        <span className="text-slate-500 text-xs">
          {[p.city, p.state].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "records",
      label: "Records",
      render: (p: Patient) => (
        <span className="text-slate-500 text-xs">
          {p._count.medicalRecords} record(s)
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (p: Patient) => (
        <span className="text-slate-400 text-xs">
          {format(new Date(p.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Search, view, and manage patient records"
        action={
          canRegister ? (
            <Button
              onClick={() => router.push("/patients/new")}
              className="bg-blue-700 hover:bg-blue-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Register Patient
            </Button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, patient number, phone or email..."
          className="max-w-md"
        />
      </div>

      {/* Table or empty state */}
      {!isLoading && typedPatients.length === 0 && !search ? (
        <EmptyState
          icon={Users}
          title="No patients registered yet"
          description="Register your first patient to get started"
          actionLabel={canRegister ? "Register Patient" : undefined}
          onAction={
            canRegister ? () => router.push("/patients/new") : undefined
          }
        />
      ) : (
        <DataTable<Patient>
          columns={columns}
          data={typedPatients}
          keyField="id"
          isLoading={isLoading}
          onRowClick={(p) => router.push(`/patients/${p.id}`)}
          pagination={{
            page,
            totalPages: pagination.totalPages,
            total: pagination.total,
            limit: pagination.limit,
            onPageChange: setPage,
          }}
          emptyMessage={
            search
              ? `No patients found matching "${search}"`
              : "No patients found"
          }
        />
      )}
    </div>
  );
}
