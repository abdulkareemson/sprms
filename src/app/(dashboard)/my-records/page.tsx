// src/app/(dashboard)/my-invoices/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Download,
  X,
  Eye,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  InvoicePDFButton,
  type InvoicePDFData,
} from "@/components/billing/InvoicePDF";
import { useDebounce } from "@/hooks/useDebounce";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientInvoice {
  id: string;
  invoiceNumber: string;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    insuranceProvider?: string | null;
    insuranceNumber?: string | null;
  };
  appointment?: {
    id: string;
    scheduledAt: string;
    type: string;
    doctor?: {
      staffProfile?: {
        firstName: string;
        lastName: string;
        specialization?: string | null;
      } | null;
    } | null;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  totalAmount: number;
  paymentStatus: "PENDING" | "PAID" | "OVERDUE";
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

type StatusFilter = "ALL" | "PENDING" | "PAID" | "OVERDUE";

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    cardBorder: "border-l-amber-400",
  },
  PAID: {
    label: "Paid",
    icon: CheckCircle,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    cardBorder: "border-l-emerald-400",
  },
  OVERDUE: {
    label: "Overdue",
    icon: AlertCircle,
    badgeClass:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    cardBorder: "border-l-red-400",
  },
} as const;

// ─── Appointment Type Labels ──────────────────────────────────────────────────

const aptTypeLabels: Record<string, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  LAB_TEST: "Lab Test",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  isLoading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isLoading: boolean;
}) {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="text-xl font-bold text-foreground">{value}</p>
            )}
          </div>
          <div
            className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center`}
          >
            <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Invoice Card (patient-friendly) ─────────────────────────────────────────

function PatientInvoiceCard({
  invoice,
  onView,
}: {
  invoice: PatientInvoice;
  onView: (invoice: PatientInvoice) => void;
}) {
  const cfg = statusConfig[invoice.paymentStatus];
  const Icon = cfg.icon;
  const pdfData: InvoicePDFData = { ...invoice };

  return (
    <Card
      className={`border border-border/50 border-l-4 ${cfg.cardBorder} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group`}
      onClick={() => onView(invoice)}
    >
      <CardContent className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(invoice.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs ${cfg.badgeClass}`}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </div>

        {/* Appointment info */}
        {invoice.appointment && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">
              {aptTypeLabels[invoice.appointment.type] ??
                invoice.appointment.type}{" "}
              —{" "}
              {format(new Date(invoice.appointment.scheduledAt), "MMM d, yyyy")}
              {invoice.appointment.doctor?.staffProfile && (
                <span className="ml-1">
                  with Dr. {invoice.appointment.doctor.staffProfile.firstName}{" "}
                  {invoice.appointment.doctor.staffProfile.lastName}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Items preview */}
        <div className="space-y-1 mb-3">
          {invoice.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[200px]">
                {item.description}
                {item.quantity > 1 && (
                  <span className="ml-1 text-[10px]">×{item.quantity}</span>
                )}
              </span>
              <span className="font-medium text-foreground ml-2 flex-shrink-0">
                ₦
                {item.amount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
          {invoice.items.length > 3 && (
            <p className="text-xs text-muted-foreground italic">
              +{invoice.items.length - 3} more item
              {invoice.items.length - 3 !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <Separator className="my-3" />

        {/* Total + actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">
              ₦
              {invoice.totalAmount.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}
            </p>
            {invoice.paidAt && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Paid{" "}
                {formatDistanceToNow(new Date(invoice.paidAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <InvoicePDFButton invoice={pdfData} variant="icon" />
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => onView(invoice)}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InvoiceCardSkeleton() {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-16 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyInvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<PatientInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    totalSpend: 0,
  });

  const debouncedSearch = useDebounce(search, 400);

  // ── Fetch invoices ─────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "ALL") params.set("paymentStatus", statusFilter);

        const res = await fetch(`/api/invoices?${params.toString()}`);
        if (!res.ok) throw new Error();

        const data = await res.json();
        setInvoices(data.invoices);
        setPagination(data.pagination);
      } catch {
        toast.error("Failed to load invoices");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, statusFilter],
  );

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, pendingRes, paidRes, overdueRes] = await Promise.all([
        fetch("/api/invoices?limit=1000"),
        fetch("/api/invoices?paymentStatus=PENDING&limit=1"),
        fetch("/api/invoices?paymentStatus=PAID&limit=1000"),
        fetch("/api/invoices?paymentStatus=OVERDUE&limit=1"),
      ]);

      const [allData, pendingData, paidData, overdueData] = await Promise.all([
        allRes.json(),
        pendingRes.json(),
        paidRes.json(),
        overdueRes.json(),
      ]);

      const totalSpend = (paidData.invoices as PatientInvoice[]).reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );

      setStats({
        total: allData.pagination.total,
        pending: pendingData.pagination.total,
        paid: paidData.pagination.total,
        overdue: overdueData.pagination.total,
        totalSpend,
      });
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleView = (invoice: PatientInvoice) => {
    router.push(`/billing/${invoice.id}`);
  };

  const hasFilters = search !== "" || statusFilter !== "ALL";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            My Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and download your billing history
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total"
          value={String(stats.total)}
          icon={FileText}
          iconBg="bg-blue-100 dark:bg-blue-950/50"
          iconColor="text-blue-600 dark:text-blue-400"
          isLoading={isLoading}
        />
        <SummaryCard
          label="Pending"
          value={String(stats.pending)}
          icon={Clock}
          iconBg="bg-amber-100 dark:bg-amber-950/50"
          iconColor="text-amber-600 dark:text-amber-400"
          isLoading={isLoading}
        />
        <SummaryCard
          label="Paid"
          value={String(stats.paid)}
          icon={CheckCircle}
          iconBg="bg-emerald-100 dark:bg-emerald-950/50"
          iconColor="text-emerald-600 dark:text-emerald-400"
          isLoading={isLoading}
        />
        <SummaryCard
          label="Overdue"
          value={String(stats.overdue)}
          icon={AlertCircle}
          iconBg="bg-red-100 dark:bg-red-950/50"
          iconColor="text-red-600 dark:text-red-400"
          isLoading={isLoading}
        />
      </div>

      {/* Total spend banner */}
      {stats.totalSpend > 0 && !isLoading && (
        <Card className="border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Total Amount Paid
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  ₦
                  {stats.totalSpend.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Invoice History
              {!isLoading && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({pagination.total})
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  fetchInvoices(pagination.page);
                  fetchStats();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {isLoading ? (
            <div className="space-y-3 pt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <InvoiceCardSkeleton key={i} />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">
                {hasFilters ? "No invoices match" : "No invoices yet"}
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {hasFilters
                  ? "Try adjusting your search or filter settings."
                  : "Your invoices will appear here once they're created by the billing team."}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              {invoices.map((invoice) => (
                <PatientInvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  onView={handleView}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
              <p className="text-xs text-muted-foreground">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchInvoices(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchInvoices(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help note for patients */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Need a receipt?
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
                You can download a PDF receipt for any invoice by clicking the
                download icon on each card. For billing queries, please contact
                the reception desk or call our billing department.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
