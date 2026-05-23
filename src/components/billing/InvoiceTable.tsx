// src/components/billing/InvoiceTable.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoicePatient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

interface InvoiceAppointment {
  id: string;
  scheduledAt: string;
  type: string;
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  patient: InvoicePatient;
  appointment?: InvoiceAppointment | null;
  totalAmount: number;
  paymentStatus: "PENDING" | "PAID" | "OVERDUE";
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  onRefresh: () => void;
  showPatient?: boolean;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  PAID: {
    label: "Paid",
    icon: CheckCircle,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  OVERDUE: {
    label: "Overdue",
    icon: AlertCircle,
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  },
} as const;

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ─── Mobile Invoice Card ──────────────────────────────────────────────────────

function InvoiceMobileCard({
  invoice,
  showPatient,
  canUpdatePayment,
  canDelete,
  onMarkPaid,
  onDelete,
  onView,
}: {
  invoice: InvoiceRow;
  showPatient: boolean;
  canUpdatePayment: boolean;
  canDelete: boolean;
  onMarkPaid: (invoice: InvoiceRow) => void;
  onDelete: (invoice: InvoiceRow) => void;
  onView: (id: string) => void;
}) {
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(invoice.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <StatusBadge status={invoice.paymentStatus} />
        </div>

        {/* Patient info */}
        {showPatient && (
          <div className="mb-2">
            <p className="text-sm font-medium text-foreground">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {invoice.patient.patientNumber}
            </p>
          </div>
        )}

        {/* Amount */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Total Amount</span>
          <span className="text-lg font-bold text-foreground">
            ₦
            {invoice.totalAmount.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => onView(invoice.id)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>

          {canUpdatePayment && invoice.paymentStatus !== "PAID" && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
              onClick={() => onMarkPaid(invoice)}
            >
              <CreditCard className="h-3 w-3 mr-1" />
              Mark Paid
            </Button>
          )}

          {canDelete && invoice.paymentStatus !== "PAID" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onDelete(invoice)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvoiceTable({
  invoices,
  onRefresh,
  showPatient = true,
}: InvoiceTableProps) {
  const router = useRouter();

  // FIX: usePermission now returns { hasPermission, role, isLoading }
  const { hasPermission, role } = usePermission();

  const canUpdatePayment = hasPermission("update_payment_status");
  const canDelete = role === "ADMIN";

  const [markPaidTarget, setMarkPaidTarget] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleView = (id: string) => router.push(`/billing/${id}`);

  const handleMarkPaid = async () => {
    if (!markPaidTarget) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${markPaidTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "PAID" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update");
      }
      toast.success(`Invoice ${markPaidTarget.invoiceNumber} marked as paid`);
      setMarkPaidTarget(null);
      onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update payment",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success(`Invoice ${deleteTarget.invoiceNumber} deleted`);
      setDeleteTarget(null);
      onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete invoice",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Empty state ────────────────────────────────────────────────────────────

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">
          No invoices found
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          No invoices match your current filters.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop Table ─────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold text-foreground pl-6">
                Invoice #
              </TableHead>
              {showPatient && (
                <TableHead className="font-semibold text-foreground">
                  Patient
                </TableHead>
              )}
              <TableHead className="font-semibold text-foreground">
                Amount
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Status
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Date
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Paid On
              </TableHead>
              <TableHead className="font-semibold text-foreground pr-6 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="hover:bg-muted/20 transition-colors duration-150 cursor-pointer group"
                onClick={() => handleView(invoice.id)}
              >
                {/* Invoice number */}
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-950 transition-colors">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">
                      {invoice.invoiceNumber}
                    </span>
                  </div>
                </TableCell>

                {/* Patient */}
                {showPatient && (
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {invoice.patient.firstName} {invoice.patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.patient.patientNumber}
                      </p>
                    </div>
                  </TableCell>
                )}

                {/* Amount */}
                <TableCell>
                  <span className="font-bold text-foreground text-base">
                    ₦
                    {invoice.totalAmount.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={invoice.paymentStatus} />
                </TableCell>

                {/* Date */}
                <TableCell>
                  <div>
                    <p className="text-sm text-foreground">
                      {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(invoice.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </TableCell>

                {/* Paid on */}
                <TableCell>
                  {invoice.paidAt ? (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      {format(new Date(invoice.paidAt), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell
                  className="pr-6 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleView(invoice.id)}
                        className="cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>

                      {canUpdatePayment && invoice.paymentStatus !== "PAID" && (
                        <DropdownMenuItem
                          onClick={() => setMarkPaidTarget(invoice)}
                          className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}

                      {canUpdatePayment &&
                        invoice.paymentStatus === "PENDING" && (
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/invoices/${invoice.id}`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      paymentStatus: "OVERDUE",
                                    }),
                                  },
                                );
                                if (!res.ok) throw new Error();
                                toast.success("Invoice marked as overdue");
                                onRefresh();
                              } catch {
                                toast.error("Failed to update status");
                              }
                            }}
                            className="cursor-pointer text-amber-600 dark:text-amber-400 focus:text-amber-600"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Mark as Overdue
                          </DropdownMenuItem>
                        )}

                      {canDelete && invoice.paymentStatus !== "PAID" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(invoice)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Invoice
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3 p-4">
        {invoices.map((invoice) => (
          <InvoiceMobileCard
            key={invoice.id}
            invoice={invoice}
            showPatient={showPatient}
            canUpdatePayment={canUpdatePayment}
            canDelete={canDelete}
            onMarkPaid={setMarkPaidTarget}
            onDelete={setDeleteTarget}
            onView={handleView}
          />
        ))}
      </div>

      {/* ── Confirm: Mark as Paid ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!markPaidTarget}
        onOpenChange={(open) => {
          if (!open) setMarkPaidTarget(null);
        }}
        title="Mark Invoice as Paid"
        description={
          markPaidTarget
            ? `Mark invoice ${markPaidTarget.invoiceNumber} (₦${markPaidTarget.totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}) as paid? This will record today as the payment date.`
            : ""
        }
        confirmLabel="Mark as Paid"
        variant="default" // FIX: was confirmVariant
        isLoading={isUpdating}
        onConfirm={handleMarkPaid}
      />

      {/* ── Confirm: Delete ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Invoice"
        description={
          deleteTarget
            ? `Delete invoice ${deleteTarget.invoiceNumber}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive" // FIX: was confirmVariant
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
