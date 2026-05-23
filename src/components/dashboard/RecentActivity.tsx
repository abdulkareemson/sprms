// src/components/dashboard/RecentActivity.tsx

"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogIn,
  LogOut,
  Plus,
  Eye,
  Edit,
  Trash2,
  Upload,
  Download,
  Key,
  Lock,
  Mail,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  action: string;
  resource: string;
  description: string;
  createdAt: string;
  user?: {
    email: string;
    role: string;
    staffProfile?: { firstName: string; lastName: string } | null;
    patient?: { firstName: string; lastName: string } | null;
  } | null;
}

interface RecentActivityProps {
  logs: ActivityLog[];
  isLoading?: boolean;
  title?: string;
  maxItems?: number;
}

// ─── Action icon map ──────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  LOGIN: { icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-50" },
  LOGOUT: { icon: LogOut, color: "text-slate-500", bg: "bg-slate-100" },
  LOGIN_FAILED: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  CREATE: { icon: Plus, color: "text-blue-600", bg: "bg-blue-50" },
  READ: { icon: Eye, color: "text-slate-500", bg: "bg-slate-100" },
  UPDATE: { icon: Edit, color: "text-amber-600", bg: "bg-amber-50" },
  DELETE: { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  UPLOAD: { icon: Upload, color: "text-violet-600", bg: "bg-violet-50" },
  EXPORT: { icon: Download, color: "text-teal-600", bg: "bg-teal-50" },
  PASSWORD_RESET: { icon: Key, color: "text-orange-600", bg: "bg-orange-50" },
  ACCOUNT_LOCKED: { icon: Lock, color: "text-red-600", bg: "bg-red-50" },
  EMAIL_VERIFIED: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
};

// ─── User display name ────────────────────────────────────────────────────────

function getUserDisplayName(log: ActivityLog): string {
  if (!log.user) return "System";
  if (log.user.staffProfile) {
    return `${log.user.staffProfile.firstName} ${log.user.staffProfile.lastName}`;
  }
  if (log.user.patient) {
    return `${log.user.patient.firstName} ${log.user.patient.lastName}`;
  }
  return log.user.email;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentActivity({
  logs,
  isLoading,
  title = "Recent Activity",
  maxItems = 8,
}: RecentActivityProps) {
  const displayLogs = logs.slice(0, maxItems);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayLogs.map((log, i) => {
              const config =
                ACTION_CONFIG[log.action] ?? ACTION_CONFIG.READ;
              const Icon = config.icon;
              const displayName = getUserDisplayName(log);
              const isLast = i === displayLogs.length - 1;

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 py-2.5 ${
                    !isLast
                      ? "border-b border-slate-50"
                      : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-snug truncate">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400 truncate">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-slate-300">·</span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${config.bg} ${config.color}`}
                  >
                    {log.action}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}