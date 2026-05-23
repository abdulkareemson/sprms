// src/app/(dashboard)/billing/[id]/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Shield,
  Stethoscope,
  Hash,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  InvoicePDFButton,
  type InvoicePDFData,
} from "@/components/billing/InvoicePDF";
import { usePermission } from "@/hooks/usePermission";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface FullInvoice {
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
    reason?: string | null;
    doctor: {
      staffProfile?: {
        firstName: string;
        lastName: string;
        specialization?: string | null;
      } | null;
    };
  } | null;
  items: InvoiceItem[];
  totalAmount: number;
  paymentStatus: "PENDING" | "PAID" | "OVERDUE";
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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

// ─── Appointment Type Labels ──────────────────────────────────────────────────

const appointmentTypeLabels: Record<string, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  LAB_TEST: "Lab Test",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  iconColor = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
      <Skeleton className="h-8 w-40" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission, role } = usePermission();

  const canUpdatePayment = hasPermission("update_payment_status");
  const canDelete = role === "ADMIN";

  const [invoice, setInvoice] = useState<FullInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<string>("");

  // ── Fetch invoice ──────────────────────────────────────────────────────────
  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvoice(data.invoice);
      setStatusValue(data.invoice.paymentStatus);
    } catch {
      toast.error("Failed to load invoice");
      router.push("/billing");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // ── Update payment status ──────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    if (!invoice || newStatus === invoice.paymentStatus) return;
    setIsUpdating(true);

    const previousStatus = statusValue;
    setStatusValue(newStatus); // Optimistic update

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setInvoice(data.invoice);
      toast.success(`Payment status updated to ${newStatus.toLowerCase()}`);
    } catch {
      setStatusValue(previousStatus); // Revert on failure
      toast.error("Failed to update payment status");
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!invoice) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }

      toast.success("Invoice deleted successfully");
      router.push("/billing");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete invoice",
      );
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />;
  if (!invoice) return null;

  const statusCfg = statusConfig[invoice.paymentStatus];
  const StatusIcon = statusCfg.icon;

  // Build PDF data object
  const pdfData: InvoicePDFData = {
    ...invoice,
    items: invoice.items,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Back + Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 px-2 text-muted-foreground hover:text-foreground w-fit -ml-2"
        >
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Invoices
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <InvoicePDFButton invoice={pdfData} />

          {canDelete && invoice.paymentStatus !== "PAID" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium w-fit ${statusCfg.className}`}
            >
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created{" "}
            {formatDistanceToNow(new Date(invoice.createdAt), {
              addSuffix: true,
            })}{" "}
            · {format(new Date(invoice.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Patient Card */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-lg font-bold text-white">
                    {invoice.patient.firstName[0]}
                    {invoice.patient.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {invoice.patient.firstName} {invoice.patient.lastName}
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                    onClick={() =>
                      router.push(`/patients/${invoice.patient.id}`)
                    }
                  >
                    {invoice.patient.patientNumber} → View Profile
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={invoice.patient.phone}
                  iconColor="text-blue-500"
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={invoice.patient.email}
                  iconColor="text-indigo-500"
                />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={
                    [
                      invoice.patient.address,
                      invoice.patient.city,
                      invoice.patient.state,
                    ]
                      .filter(Boolean)
                      .join(", ") || null
                  }
                  iconColor="text-rose-500"
                />
                <InfoRow
                  icon={Shield}
                  label="Insurance"
                  value={
                    invoice.patient.insuranceProvider
                      ? `${invoice.patient.insuranceProvider}${
                          invoice.patient.insuranceNumber
                            ? ` · ${invoice.patient.insuranceNumber}`
                            : ""
                        }`
                      : null
                  }
                  iconColor="text-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appointment Card (if linked) */}
          {invoice.appointment && (
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  Linked Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow
                  icon={Calendar}
                  label="Date & Time"
                  value={format(
                    new Date(invoice.appointment.scheduledAt),
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                  iconColor="text-violet-500"
                />
                <InfoRow
                  icon={Stethoscope}
                  label="Type"
                  value={
                    appointmentTypeLabels[invoice.appointment.type] ??
                    invoice.appointment.type
                  }
                  iconColor="text-cyan-500"
                />
                {invoice.appointment.doctor?.staffProfile && (
                  <InfoRow
                    icon={User}
                    label="Attending Doctor"
                    value={`Dr. ${invoice.appointment.doctor.staffProfile.firstName} ${invoice.appointment.doctor.staffProfile.lastName}${
                      invoice.appointment.doctor.staffProfile.specialization
                        ? ` · ${invoice.appointment.doctor.staffProfile.specialization}`
                        : ""
                    }`}
                    iconColor="text-blue-500"
                  />
                )}
                {invoice.appointment.reason && (
                  <InfoRow
                    icon={StickyNote}
                    label="Reason"
                    value={invoice.appointment.reason}
                    iconColor="text-amber-500"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Line Items Card */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                Invoice Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-2.5 bg-muted/30 border-b border-border/50">
                <span className="col-span-1 text-xs font-semibold text-muted-foreground">
                  #
                </span>
                <span className="col-span-5 text-xs font-semibold text-muted-foreground">
                  Description
                </span>
                <span className="col-span-2 text-xs font-semibold text-muted-foreground text-center">
                  Qty
                </span>
                <span className="col-span-2 text-xs font-semibold text-muted-foreground text-right">
                  Unit Price
                </span>
                <span className="col-span-2 text-xs font-semibold text-muted-foreground text-right">
                  Amount
                </span>
              </div>

              {/* Item rows */}
              {invoice.items.map((item, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-12 gap-2 px-6 py-3.5 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors ${
                    i % 2 === 0 ? "" : "bg-muted/5"
                  }`}
                >
                  {/* # */}
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 h-5 w-5 rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="col-span-11 sm:col-span-5 flex items-center">
                    <span className="text-sm font-medium text-foreground">
                      {item.description}
                    </span>
                  </div>

                  {/* Qty */}
                  <div className="col-span-4 sm:col-span-2 flex items-center sm:justify-center">
                    <span className="text-xs sm:text-sm text-muted-foreground sm:text-foreground">
                      <span className="sm:hidden text-xs text-muted-foreground mr-1">
                        Qty:
                      </span>
                      {item.quantity}
                    </span>
                  </div>

                  {/* Unit price */}
                  <div className="col-span-4 sm:col-span-2 flex items-center sm:justify-end">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      <span className="sm:hidden text-xs mr-1">@</span>₦
                      {item.unitPrice.toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end">
                    <span className="text-sm font-bold text-foreground">
                      ₦
                      {item.amount.toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center justify-end gap-6 px-6 py-4 bg-gradient-to-r from-transparent to-blue-50/50 dark:to-blue-950/20 border-t-2 border-border">
                <span className="text-sm font-semibold text-muted-foreground">
                  Total
                </span>
                <span className="text-xl font-bold text-foreground">
                  ₦
                  {invoice.totalAmount.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {invoice.notes && (
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                    <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN (1/3) ────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Payment Summary */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Grand Total */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Amount
                </p>
                <p className="text-3xl font-bold text-foreground">
                  ₦
                  {invoice.totalAmount.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <Separator />

              {/* Status + change */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment Status
                </p>
                {canUpdatePayment ? (
                  <div className="relative">
                    <Select
                      value={statusValue}
                      onValueChange={handleStatusChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        {isUpdating ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">
                          <span className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="PAID">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            Paid
                          </span>
                        </SelectItem>
                        <SelectItem value="OVERDUE">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            Overdue
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium w-fit ${statusCfg.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusCfg.label}
                  </Badge>
                )}
              </div>

              {/* Paid on date */}
              {invoice.paidAt && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Payment Received
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {format(new Date(invoice.paidAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Meta info */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Invoice Number
                  </span>
                  <span className="text-xs font-medium text-foreground ml-auto">
                    {invoice.invoiceNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs font-medium text-foreground ml-auto">
                    {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Last Updated
                  </span>
                  <span className="text-xs font-medium text-foreground ml-auto">
                    {formatDistanceToNow(new Date(invoice.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Items</span>
                  <span className="text-xs font-medium text-foreground ml-auto">
                    {invoice.items.length} line item
                    {invoice.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Download PDF */}
              <div className="pt-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Export
                </p>
                <InvoicePDFButton invoice={pdfData} />
              </div>
            </CardContent>
          </Card>

          {/* Quick navigation */}
          <Card className="border border-border/50 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Quick Links
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-9 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => router.push(`/patients/${invoice.patient.id}`)}
              >
                <User className="h-4 w-4 mr-2 text-blue-500" />
                View Patient Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-9 text-sm text-muted-foreground hover:text-foreground"
                onClick={() =>
                  router.push(`/patients/${invoice.patient.id}/invoices`)
                }
              >
                <FileText className="h-4 w-4 mr-2 text-purple-500" />
                All Patient Invoices
              </Button>
              {invoice.appointment && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-9 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => router.push(`/appointments`)}
                >
                  <Calendar className="h-4 w-4 mr-2 text-violet-500" />
                  View Appointments
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Invoice"
        description={`Permanently delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`}
        confirmLabel="Delete Invoice"
        variant="destructive" // FIX: was confirmVariant
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
