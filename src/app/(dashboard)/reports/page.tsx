// src/app/(dashboard)/reports/page.tsx

"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileText,
  Users,
  Calendar,
  Receipt,
  Download,
  Search,
  BarChart3,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { generateReportPDF } from "@/components/reports/ReportPDF";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = "patients" | "appointments" | "revenue" | "records";

interface ReportSummary {
  total: number;
  [key: string]: unknown;
}

interface ReportData {
  reportType: ReportType;
  data: Record<string, unknown>[];
  summary: ReportSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Report Type Config ───────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    value: "patients" as ReportType,
    label: "Patient Records Report",
    icon: Users,
    description: "All registered patients with demographics",
    color: "blue",
    adminOnly: false,
  },
  {
    value: "appointments" as ReportType,
    label: "Appointment Summary",
    icon: Calendar,
    description: "Appointment bookings and status overview",
    color: "green",
    adminOnly: false,
  },
  {
    value: "records" as ReportType,
    label: "Medical Records Report",
    icon: FileText,
    description: "Medical records created in date range",
    color: "purple",
    adminOnly: false,
  },
  {
    value: "revenue" as ReportType,
    label: "Revenue & Billing Report",
    icon: Receipt,
    description: "Invoice totals and payment status",
    color: "orange",
    adminOnly: true,
  },
];

const COLOR_MAP = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-emerald-50 border-emerald-200 text-emerald-700",
  purple: "bg-violet-50 border-violet-200 text-violet-700",
  orange: "bg-amber-50 border-amber-200 text-amber-700",
};

const ICON_BG = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-emerald-100 text-emerald-600",
  purple: "bg-violet-100 text-violet-600",
  orange: "bg-amber-100 text-amber-600",
};

// ─── Summary Cards ────────────────────────────────────────────────────────────

function ReportSummaryCards({
  reportType,
  summary,
}: {
  reportType: ReportType;
  summary: ReportSummary;
}) {
  if (reportType === "patients") {
    const byGender =
      (summary.byGender as Array<{
        gender: string;
        _count: { gender: number };
      }>) ?? [];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
            Total
          </p>
          <p className="text-2xl font-bold text-blue-800 mt-0.5">
            {summary.total}
          </p>
        </div>
        {byGender.map((g) => (
          <div
            key={g.gender}
            className="bg-slate-50 border border-slate-100 rounded-xl p-3"
          >
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              {g.gender}
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {g._count.gender}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (reportType === "revenue") {
    const rev = summary as {
      total: number;
      totalRevenue: number;
      paidRevenue: number;
      pendingRevenue: number;
      overdueRevenue: number;
    };
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          {
            label: "Total Invoices",
            value: rev.total,
            prefix: "",
            color: "bg-slate-50 border-slate-100",
            text: "text-slate-800",
          },
          {
            label: "Total Billed",
            value: `₦${(rev.totalRevenue ?? 0).toLocaleString()}`,
            prefix: "",
            color: "bg-blue-50 border-blue-100",
            text: "text-blue-800",
          },
          {
            label: "Collected",
            value: `₦${(rev.paidRevenue ?? 0).toLocaleString()}`,
            prefix: "",
            color: "bg-emerald-50 border-emerald-100",
            text: "text-emerald-800",
          },
          {
            label: "Outstanding",
            value: `₦${((rev.pendingRevenue ?? 0) + (rev.overdueRevenue ?? 0)).toLocaleString()}`,
            prefix: "",
            color: "bg-amber-50 border-amber-100",
            text: "text-amber-800",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`${item.color} border rounded-xl p-3`}
          >
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider truncate">
              {item.label}
            </p>
            <p className={`text-xl font-bold mt-0.5 truncate ${item.text}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (reportType === "appointments") {
    const statusSummary =
      (summary.statusSummary as Array<{
        status: string;
        _count: { status: number };
      }>) ?? [];

    const STATUS_COLORS: Record<string, string> = {
      COMPLETED: "bg-emerald-50 border-emerald-100 text-emerald-800",
      SCHEDULED: "bg-blue-50 border-blue-100 text-blue-800",
      CANCELLED: "bg-red-50 border-red-100 text-red-800",
      NO_SHOW: "bg-amber-50 border-amber-100 text-amber-800",
      CONFIRMED: "bg-teal-50 border-teal-100 text-teal-800",
      IN_PROGRESS: "bg-orange-50 border-orange-100 text-orange-800",
    };

    return (
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 min-w-[100px]">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">
            {summary.total}
          </p>
        </div>
        {statusSummary.map((s) => (
          <div
            key={s.status}
            className={`border rounded-xl p-3 min-w-[100px] ${
              STATUS_COLORS[s.status] ??
              "bg-slate-50 border-slate-100 text-slate-800"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
              {s.status.replace(/_/g, " ")}
            </p>
            <p className="text-2xl font-bold mt-0.5">{s._count.status}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-4">
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
        <p className="text-xs text-violet-600 font-semibold uppercase tracking-wider">
          Total Records
        </p>
        <p className="text-2xl font-bold text-violet-800 mt-0.5">
          {summary.total}
        </p>
      </div>
    </div>
  );
}

// ─── Table Columns by Report Type ────────────────────────────────────────────

function getColumns(reportType: ReportType) {
  if (reportType === "patients") {
    return [
      { key: "patientNumber", label: "Patient No." },
      {
        key: "name",
        label: "Name",
        render: (r: Record<string, unknown>) => `${r.firstName} ${r.lastName}`,
      },
      {
        key: "dateOfBirth",
        label: "Date of Birth",
        render: (r: Record<string, unknown>) =>
          r.dateOfBirth
            ? format(new Date(r.dateOfBirth as string), "MMM d, yyyy")
            : "—",
      },
      { key: "gender", label: "Gender" },
      { key: "phone", label: "Phone" },
      {
        key: "records",
        label: "Records",
        render: (r: Record<string, unknown>) => {
          const count = r._count as { medicalRecords: number } | undefined;
          return String(count?.medicalRecords ?? 0);
        },
      },
      {
        key: "createdAt",
        label: "Registered",
        render: (r: Record<string, unknown>) =>
          format(new Date(r.createdAt as string), "MMM d, yyyy"),
      },
    ];
  }

  if (reportType === "appointments") {
    return [
      {
        key: "patient",
        label: "Patient",
        render: (r: Record<string, unknown>) => {
          const p = r.patient as
            | { firstName: string; lastName: string; patientNumber: string }
            | undefined;
          return p ? `${p.firstName} ${p.lastName}` : "—";
        },
      },
      {
        key: "doctor",
        label: "Doctor",
        render: (r: Record<string, unknown>) => {
          const d = r.doctor as
            | { staffProfile?: { firstName: string; lastName: string } | null }
            | undefined;
          return d?.staffProfile
            ? `Dr. ${d.staffProfile.firstName} ${d.staffProfile.lastName}`
            : "—";
        },
      },
      {
        key: "scheduledAt",
        label: "Date & Time",
        render: (r: Record<string, unknown>) =>
          format(new Date(r.scheduledAt as string), "MMM d, yyyy h:mm a"),
      },
      { key: "type", label: "Type" },
      {
        key: "status",
        label: "Status",
        render: (r: Record<string, unknown>) => {
          const statusColors: Record<string, string> = {
            COMPLETED: "text-emerald-700 bg-emerald-50",
            CANCELLED: "text-red-700 bg-red-50",
            SCHEDULED: "text-blue-700 bg-blue-50",
            CONFIRMED: "text-teal-700 bg-teal-50",
            IN_PROGRESS: "text-amber-700 bg-amber-50",
            NO_SHOW: "text-slate-700 bg-slate-100",
          };
          const status = r.status as string;
          return (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                statusColors[status] ?? "text-slate-700 bg-slate-100"
              }`}
            >
              {status.replace(/_/g, " ")}
            </span>
          );
        },
      },
    ];
  }

  if (reportType === "revenue") {
    return [
      { key: "invoiceNumber", label: "Invoice No." },
      {
        key: "patient",
        label: "Patient",
        render: (r: Record<string, unknown>) => {
          const p = r.patient as
            | { firstName: string; lastName: string }
            | undefined;
          return p ? `${p.firstName} ${p.lastName}` : "—";
        },
      },
      {
        key: "totalAmount",
        label: "Amount",
        render: (r: Record<string, unknown>) =>
          `₦${(r.totalAmount as number).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
          })}`,
      },
      {
        key: "paymentStatus",
        label: "Status",
        render: (r: Record<string, unknown>) => {
          const map: Record<string, string> = {
            PAID: "text-emerald-700 bg-emerald-50",
            PENDING: "text-amber-700 bg-amber-50",
            OVERDUE: "text-red-700 bg-red-50",
          };
          const s = r.paymentStatus as string;
          return (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                map[s] ?? ""
              }`}
            >
              {s}
            </span>
          );
        },
      },
      {
        key: "createdAt",
        label: "Date",
        render: (r: Record<string, unknown>) =>
          format(new Date(r.createdAt as string), "MMM d, yyyy"),
      },
    ];
  }

  // records
  return [
    { key: "recordNumber", label: "Record No." },
    {
      key: "patient",
      label: "Patient",
      render: (r: Record<string, unknown>) => {
        const p = r.patient as
          | { firstName: string; lastName: string }
          | undefined;
        return p ? `${p.firstName} ${p.lastName}` : "—";
      },
    },
    {
      key: "recordType",
      label: "Type",
      render: (r: Record<string, unknown>) => (
        <span className="text-xs font-medium px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full">
          {(r.recordType as string).replace(/_/g, " ")}
        </span>
      ),
    },
    { key: "title", label: "Title" },
    {
      key: "createdBy",
      label: "Created By",
      render: (r: Record<string, unknown>) => {
        const cb = r.createdBy as
          | { staffProfile?: { firstName: string; lastName: string } | null }
          | undefined;
        return cb?.staffProfile
          ? `${cb.staffProfile.firstName} ${cb.staffProfile.lastName}`
          : "—";
      },
    },
    {
      key: "createdAt",
      label: "Date",
      render: (r: Record<string, unknown>) =>
        format(new Date(r.createdAt as string), "MMM d, yyyy"),
    },
  ];
}

// ─── Main Reports Page ────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [selectedType, setSelectedType] = useState<ReportType>("patients");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const fetchReport = useCallback(
    async (pageNum = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          type: selectedType,
          page: String(pageNum),
          limit: "20",
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
        });

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to generate report");
        }
        const data: ReportData = await res.json();
        setReportData(data);
        setHasGenerated(true);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to generate report",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedType, fromDate, toDate],
  );

  const handleExportPDF = async () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      generateReportPDF({
        reportType: selectedType,
        data: reportData.data,
        summary: reportData.summary,
        fromDate,
        toDate,
        generatedBy: session?.user?.name ?? "Admin",
      });
      toast.success("PDF exported successfully");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const availableTypes = REPORT_TYPES.filter((t) => !t.adminOnly || isAdmin);

  const columns = getColumns(selectedType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export system reports with date range filtering"
        action={
          hasGenerated && reportData ? (
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          ) : undefined
        }
      />

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {availableTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.value;
          const color = type.color as keyof typeof COLOR_MAP;

          return (
            <button
              key={type.value}
              onClick={() => {
                setSelectedType(type.value);
                setReportData(null);
                setHasGenerated(false);
              }}
              className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? `${COLOR_MAP[color]} border-current shadow-md`
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                  isSelected ? ICON_BG[color] : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p
                className={`text-sm font-semibold ${
                  isSelected ? "" : "text-slate-700"
                }`}
              >
                {type.label}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isSelected ? "opacity-70" : "text-slate-400"
                }`}
              >
                {type.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs font-medium text-slate-600">
                Report Type
              </Label>
              <Select
                value={selectedType}
                onValueChange={(v) => {
                  setSelectedType(v as ReportType);
                  setReportData(null);
                  setHasGenerated(false);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                From Date
              </Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-xl text-sm w-[160px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                To Date
              </Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-xl text-sm w-[160px]"
              />
            </div>

            <Button
              onClick={() => fetchReport(1)}
              disabled={isLoading}
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>

            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="h-9 text-sm text-slate-500 hover:text-slate-700 rounded-xl"
              >
                Clear Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!hasGenerated && !isLoading && (
        <EmptyState
          icon={TrendingUp}
          title="Select a report type and generate"
          description="Choose the report type above, optionally set a date range, then click Generate Report."
        />
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      )}

      {hasGenerated && !isLoading && reportData && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-700">
                  {REPORT_TYPES.find((t) => t.value === selectedType)?.label}
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  {fromDate && toDate
                    ? `${format(new Date(fromDate), "MMM d, yyyy")} – ${format(
                        new Date(toDate),
                        "MMM d, yyyy",
                      )}`
                    : fromDate
                      ? `From ${format(new Date(fromDate), "MMM d, yyyy")}`
                      : toDate
                        ? `Until ${format(new Date(toDate), "MMM d, yyyy")}`
                        : "All time"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                  {reportData.pagination.total} records
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <ReportSummaryCards
              reportType={selectedType}
              summary={reportData.summary}
            />

            {/* Table */}
            {reportData.data.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">
                  No data found for the selected filters
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns as Parameters<typeof DataTable>[0]["columns"]}
                data={
                  reportData.data as Parameters<typeof DataTable>[0]["data"]
                }
                keyField={"id" as never}
                pagination={{
                  page: reportData.pagination.page,
                  totalPages: reportData.pagination.totalPages,
                  total: reportData.pagination.total,
                  limit: reportData.pagination.limit,
                  onPageChange: (p) => fetchReport(p),
                }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
