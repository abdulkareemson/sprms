// src/app/(dashboard)/audit-logs/page.tsx

"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
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
import { toast } from "sonner";
import {
  Shield,
  Search,
  Download,
  LogIn,
  LogOut,
  Plus,
  Eye,
  Edit,
  Trash2,
  Upload,
  Key,
  Lock,
  Mail,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { generateAuditLogPDF } from "@/components/reports/AuditLogPDF";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  description: string;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    email: string;
    role: string;
    staffProfile?: { firstName: string; lastName: string } | null;
    patient?: { firstName: string; lastName: string } | null;
  } | null;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  actionSummary: Array<{ action: string; _count: { action: number } }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  LOGIN: {
    icon: LogIn,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Login",
  },
  LOGOUT: {
    icon: LogOut,
    color: "text-slate-600",
    bg: "bg-slate-100",
    label: "Logout",
  },
  LOGIN_FAILED: {
    icon: AlertCircle,
    color: "text-red-700",
    bg: "bg-red-100",
    label: "Login Failed",
  },
  CREATE: {
    icon: Plus,
    color: "text-blue-700",
    bg: "bg-blue-100",
    label: "Create",
  },
  READ: {
    icon: Eye,
    color: "text-slate-600",
    bg: "bg-slate-100",
    label: "Read",
  },
  UPDATE: {
    icon: Edit,
    color: "text-amber-700",
    bg: "bg-amber-100",
    label: "Update",
  },
  DELETE: {
    icon: Trash2,
    color: "text-red-700",
    bg: "bg-red-100",
    label: "Delete",
  },
  UPLOAD: {
    icon: Upload,
    color: "text-violet-700",
    bg: "bg-violet-100",
    label: "Upload",
  },
  EXPORT: {
    icon: Download,
    color: "text-teal-700",
    bg: "bg-teal-100",
    label: "Export",
  },
  PASSWORD_RESET: {
    icon: Key,
    color: "text-orange-700",
    bg: "bg-orange-100",
    label: "Password Reset",
  },
  ACCOUNT_LOCKED: {
    icon: Lock,
    color: "text-red-700",
    bg: "bg-red-100",
    label: "Locked",
  },
  EMAIL_VERIFIED: {
    icon: Mail,
    color: "text-blue-700",
    bg: "bg-blue-100",
    label: "Email Verified",
  },
};

const ALL_ACTIONS = Object.keys(ACTION_CONFIG);

// ─── User display name ────────────────────────────────────────────────────────

function getUserName(log: AuditLogEntry): string {
  if (!log.user) return "System";
  if (log.user.staffProfile) {
    return `${log.user.staffProfile.firstName} ${log.user.staffProfile.lastName}`;
  }
  if (log.user.patient) {
    return `${log.user.patient.firstName} ${log.user.patient.lastName}`;
  }
  return log.user.email;
}

// ─── Action Badge ─────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const config = ACTION_CONFIG[action];
  if (!config) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">
        {action}
      </span>
    );
  }
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${config.bg} ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const { data: session, status } = useSession();

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      window.location.href = "/dashboard";
    }
  }, [session, status]);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actionSummary, setActionSummary] = useState<
    Array<{ action: string; _count: { action: number } }>
  >([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLogs = useCallback(
    async (pageNum = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
          ...(search ? { search } : {}),
          ...(selectedAction !== "ALL" ? { action: selectedAction } : {}),
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
        });

        const res = await fetch(`/api/audit-logs?${params}`);
        if (!res.ok) throw new Error("Failed to fetch audit logs");

        const data: AuditLogResponse = await res.json();
        setLogs(data.logs);
        setActionSummary(data.actionSummary);
        setPagination(data.pagination);
      } catch {
        toast.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedAction, fromDate, toDate],
  );

  // Load on mount
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSearch = () => fetchLogs(1);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      generateAuditLogPDF({
        logs,
        fromDate,
        toDate,
        generatedBy: session?.user?.name ?? "Admin",
        total: pagination.total,
      });
      toast.success("Audit log exported to PDF");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedAction("ALL");
    setFromDate("");
    setToDate("");
  };

  // Table columns
  const columns = [
    {
      key: "action",
      label: "Action",
      render: (log: AuditLogEntry) => <ActionBadge action={log.action} />,
    },
    {
      key: "user",
      label: "User",
      render: (log: AuditLogEntry) => (
        <div>
          <p className="text-sm font-medium text-slate-700">
            {getUserName(log)}
          </p>
          {log.user && (
            <p className="text-xs text-slate-400">
              {log.user.role} · {log.user.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "resource",
      label: "Resource",
      render: (log: AuditLogEntry) => (
        <div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {log.resource}
          </span>
          {log.resourceId && (
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {log.resourceId.slice(0, 12)}…
            </p>
          )}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (log: AuditLogEntry) => (
        <p className="text-sm text-slate-600 max-w-xs truncate">
          {log.description}
        </p>
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (log: AuditLogEntry) => (
        <span className="text-xs font-mono text-slate-500">
          {log.ipAddress ?? "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Timestamp",
      render: (log: AuditLogEntry) => (
        <div>
          <p className="text-sm text-slate-700">
            {format(new Date(log.createdAt), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-slate-400">
            {format(new Date(log.createdAt), "HH:mm:ss")} ·{" "}
            {formatDistanceToNow(new Date(log.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      ),
    },
  ];

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Complete system activity trail — every action logged with user, timestamp, and IP"
        action={
          <Button
            onClick={handleExportPDF}
            disabled={isExporting || logs.length === 0}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        }
      />

      {/* Action Summary Strip */}
      {actionSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actionSummary.slice(0, 8).map((item) => {
            const config = ACTION_CONFIG[item.action];
            if (!config) return null;
            return (
              <button
                key={item.action}
                onClick={() => {
                  setSelectedAction(
                    selectedAction === item.action ? "ALL" : item.action,
                  );
                  fetchLogs(1);
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all ${
                  selectedAction === item.action
                    ? `${config.bg} ${config.color} border-current shadow-sm`
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <config.icon className="h-3 w-3" />
                {config.label}
                <span className="ml-0.5 opacity-70">{item._count.action}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            Filter Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs font-medium text-slate-600">
                Search Description
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search log descriptions..."
                  className="pl-8 h-9 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Action filter */}
            <div className="space-y-1.5 w-[160px]">
              <Label className="text-xs font-medium text-slate-600">
                Action
              </Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  {ALL_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_CONFIG[a]?.label ?? a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-xl text-sm w-[150px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-xl text-sm w-[150px]"
              />
            </div>

            <Button
              onClick={handleSearch}
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Search className="h-4 w-4" />
              Filter
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                handleClearFilters();
                setTimeout(() => fetchLogs(1), 50);
              }}
              className="h-9 text-sm text-slate-500 hover:text-slate-700 rounded-xl"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">{logs.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {pagination.total}
            </span>{" "}
            log entries
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchLogs(pagination.page)}
            className="gap-2 text-slate-500 hover:text-slate-700 rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="pt-4">
          {!isLoading && logs.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No audit logs found"
              description="No logs match your current filter criteria. Try adjusting the filters above."
              actionLabel="Clear Filters"
              onAction={() => {
                handleClearFilters();
                setTimeout(() => fetchLogs(1), 50);
              }}
            />
          ) : (
            <DataTable
              columns={columns as Parameters<typeof DataTable>[0]["columns"]}
              data={logs as Parameters<typeof DataTable>[0]["data"]}
              keyField={"id" as never}
              isLoading={isLoading}
              pagination={{
                page: pagination.page,
                totalPages: pagination.totalPages,
                total: pagination.total,
                limit: pagination.limit,
                onPageChange: (p) => fetchLogs(p),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
