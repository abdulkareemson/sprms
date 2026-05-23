// src/components/pharmacy/PrescriptionCard.tsx

"use client";

import {
  Pill,
  Clock,
  CheckCircle,
  RefreshCw,
  User,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import type { Prescription } from "@/hooks/usePrescriptions";

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  DISPENSED: {
    label: "Dispensed",
    icon: CheckCircle,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  PARTIALLY_DISPENSED: {
    label: "Partial",
    icon: RefreshCw,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
} as const;

// ─── Route labels ─────────────────────────────────────────────────────────────

const routeLabels: Record<string, string> = {
  ORAL: "Oral",
  INTRAVENOUS: "IV",
  TOPICAL: "Topical",
  INHALED: "Inhaled",
  SUBLINGUAL: "Sublingual",
  RECTAL: "Rectal",
  INJECTION: "Injection",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrescriptionCardProps {
  prescription: Prescription;
  canDispense: boolean;
  showPatient?: boolean;
  onDispense: (prescription: Prescription) => void;
  onViewRecord?: (recordId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrescriptionCard({
  prescription,
  canDispense,
  showPatient = true,
  onDispense,
  onViewRecord,
}: PrescriptionCardProps) {
  const status = prescription.dispenseStatus as keyof typeof statusConfig;
  const cfg = statusConfig[status] ?? statusConfig.PENDING;
  const StatusIcon = cfg.icon;

  const isPending = prescription.dispenseStatus === "PENDING";
  const isPartial = prescription.dispenseStatus === "PARTIALLY_DISPENSED";
  const canAct = canDispense && (isPending || isPartial);

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icon */}
          <div className="h-11 w-11 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center flex-shrink-0">
            <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Top row: medication name + status */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-foreground text-base leading-tight">
                  {prescription.medicationName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {prescription.dosage} · {prescription.frequency} ·{" "}
                  {prescription.duration}
                  {prescription.route && (
                    <span className="ml-1">
                      · {routeLabels[prescription.route] ?? prescription.route}
                    </span>
                  )}
                </p>
              </div>

              <Badge
                variant="outline"
                className={`flex items-center gap-1 text-xs flex-shrink-0 ${cfg.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </Badge>
            </div>

            {/* Patient info */}
            {showPatient && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
                <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {prescription.patient.firstName[0]}
                    {prescription.patient.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {prescription.patient.firstName}{" "}
                    {prescription.patient.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prescription.patient.patientNumber}
                  </p>
                </div>
                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </div>
            )}

            {/* Prescriber + date */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {prescription.prescribedBy?.staffProfile && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Dr. {prescription.prescribedBy.staffProfile.firstName}{" "}
                  {prescription.prescribedBy.staffProfile.lastName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(prescription.createdAt), "MMM d, yyyy")}
                <span className="text-muted-foreground/60 ml-1">
                  (
                  {formatDistanceToNow(new Date(prescription.createdAt), {
                    addSuffix: true,
                  })}
                  )
                </span>
              </span>
            </div>

            {/* Instructions (if present) */}
            {prescription.instructions && (
              <p className="text-xs text-muted-foreground italic bg-muted/20 px-3 py-2 rounded-lg border border-border/30">
                📋 {prescription.instructions}
              </p>
            )}

            {/* Dispensing notes (if dispensed) */}
            {prescription.dispensingNotes && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                ✓ {prescription.dispensingNotes}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {canAct && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onDispense(prescription)}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {isPartial ? "Update Dispense" : "Dispense"}
                </Button>
              )}

              {prescription.recordId && onViewRecord && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => onViewRecord(prescription.recordId!)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Record
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
