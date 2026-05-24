// src/components/shared/DataTable.tsx

"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface PaginationConfig {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  pagination?: PaginationConfig;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

// ─── Skeleton Rows ────────────────────────────────────────────────────────────
// Uses your existing Skeleton component (animate-pulse bg-muted)

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <Skeleton
                className={cn(
                  "h-4 rounded-lg",
                  j === 0
                    ? "w-20"
                    : j === cols - 1
                      ? "w-16"
                      : "w-full max-w-[140px]",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  keyField,
  isLoading,
  pagination,
  onRowClick,
  emptyMessage = "No records found",
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm min-w-[600px]">
          {/* Head */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left px-4 py-3",
                    "text-xs font-semibold text-slate-500",
                    "uppercase tracking-wider whitespace-nowrap",
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.className,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-slate-100">
            {isLoading ? (
              <SkeletonRows cols={columns.length} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-14 text-slate-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={String(item[keyField] ?? index)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "transition-colors duration-150 animate-fade-in",
                    onRowClick
                      ? "cursor-pointer hover:bg-blue-50/60"
                      : "hover:bg-slate-50",
                  )}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5 text-slate-700",
                        col.hideOnMobile && "hidden sm:table-cell",
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : String(
                            (item as Record<string, unknown>)[col.key] ?? "—",
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>
            {" – "}
            <span className="font-semibold text-slate-700">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {pagination.total}
            </span>{" "}
            results
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="rounded-lg"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="rounded-lg"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="text-xs text-slate-600 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium min-w-[80px] text-center">
              {pagination.page} / {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
