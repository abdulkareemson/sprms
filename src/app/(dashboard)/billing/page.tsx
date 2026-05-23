// src/app/(dashboard)/billing/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  InvoiceTable,
  type InvoiceRow,
} from "@/components/billing/InvoiceTable";
import { usePermission } from "@/hooks/usePermission";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type PaymentStatusFilter = "ALL" | "PENDING" | "PAID" | "OVERDUE";

// ─── Stats Card ───────────────────────────────────────────────────────────────

function BillingStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isLoading: boolean;
}) {
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-28 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground truncate">
                {value}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div
            className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 ml-3`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-4 border-b border-border/50"
        >
          <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-24 hidden md:block" />
          <Skeleton className="h-6 w-20 rounded-full hidden md:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-8 w-8 rounded hidden md:block" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();

  // FIX: destructure correctly from usePermission()
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("generate_invoice");

  // ── State ──────────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("ALL");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    revenue: 0,
  });

  const debouncedSearch = useDebounce(search, 400);

  // ── Fetch invoices ─────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "10" });
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
      const [pendingRes, paidRes, overdueRes] = await Promise.all([
        fetch("/api/invoices?paymentStatus=PENDING&limit=1"),
        fetch("/api/invoices?paymentStatus=PAID&limit=1"),
        fetch("/api/invoices?paymentStatus=OVERDUE&limit=1"),
      ]);
      const [pendingData, paidData, overdueData] = await Promise.all([
        pendingRes.json(),
        paidRes.json(),
        overdueRes.json(),
      ]);

      const allPaidRes = await fetch(
        "/api/invoices?paymentStatus=PAID&limit=1000",
      );
      const allPaidData = await allPaidRes.json();
      const revenue = (allPaidData.invoices as InvoiceRow[]).reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );

      setStats({
        total:
          pendingData.pagination.total +
          paidData.pagination.total +
          overdueData.pagination.total,
        pending: pendingData.pagination.total,
        paid: paidData.pagination.total,
        overdue: overdueData.pagination.total,
        revenue,
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

  const handleRefresh = () => {
    fetchInvoices(pagination.page);
    fetchStats();
  };

  const hasActiveFilters = search !== "" || statusFilter !== "ALL";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      {/* FIX: PageHeader action prop is ReactNode — pass a Button directly */}
      <PageHeader
        title="Billing & Invoices"
        description="Manage patient invoices and track payment status"
        action={
          canCreate ? (
            <Button
              onClick={() => router.push("/billing/new")}
              className="h-9 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          ) : undefined
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BillingStatCard
          title="Total Invoices"
          value={String(stats.total)}
          icon={FileText}
          iconBg="bg-blue-100 dark:bg-blue-950/50"
          iconColor="text-blue-600 dark:text-blue-400"
          isLoading={isLoading}
        />
        <BillingStatCard
          title="Pending"
          value={String(stats.pending)}
          subtitle="Awaiting payment"
          icon={Clock}
          iconBg="bg-amber-100 dark:bg-amber-950/50"
          iconColor="text-amber-600 dark:text-amber-400"
          isLoading={isLoading}
        />
        <BillingStatCard
          title="Paid"
          value={String(stats.paid)}
          subtitle="Completed"
          icon={CheckCircle}
          iconBg="bg-emerald-100 dark:bg-emerald-950/50"
          iconColor="text-emerald-600 dark:text-emerald-400"
          isLoading={isLoading}
        />
        <BillingStatCard
          title="Overdue"
          value={String(stats.overdue)}
          subtitle="Requires attention"
          icon={AlertCircle}
          iconBg="bg-red-100 dark:bg-red-950/50"
          iconColor="text-red-600 dark:text-red-400"
          isLoading={isLoading}
        />
      </div>

      {/* Revenue card */}
      <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Total Revenue Collected
              </p>
              {isLoading ? (
                <Skeleton className="h-9 w-40" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  ₦
                  {stats.revenue.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                From {stats.paid} paid invoice{stats.paid !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <DollarSign className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters + Table */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              All Invoices
              {!isLoading && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({pagination.total})
                </span>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Search + Status Filter */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
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
              onValueChange={(v) => setStatusFilter(v as PaymentStatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
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

        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <InvoiceTable
              invoices={invoices}
              onRefresh={handleRefresh}
              showPatient={true}
            />
          )}
        </CardContent>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {pagination.total}
              </span>{" "}
              invoices
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={pagination.page <= 1}
                onClick={() => fetchInvoices(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
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
      </Card>
    </div>
  );
}
