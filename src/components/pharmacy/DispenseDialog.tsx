// src/components/pharmacy/DispenseDialog.tsx

"use client";

import { useState } from "react";
import { Pill, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Prescription } from "@/hooks/usePrescriptions";
import type { DispenseStatus } from "@/schemas/prescription.schema";

// ── Props ─────────────────────────────────────────────────────────────────────
interface DispenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: Prescription | null;
  onConfirm: (
    id: string,
    status: DispenseStatus,
    notes?: string,
  ) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DispenseDialog({
  open,
  onOpenChange,
  prescription,
  onConfirm,
}: DispenseDialogProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<DispenseStatus>("DISPENSED");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!prescription) return;
    setError("");
    setIsLoading(true);
    try {
      await onConfirm(
        prescription.id,
        selectedStatus,
        notes.trim() || undefined,
      );
      setNotes("");
      setSelectedStatus("DISPENSED");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update prescription",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setNotes("");
    setError("");
    setSelectedStatus("DISPENSED");
    onOpenChange(false);
  };

  if (!prescription) return null;

  const isPartial = prescription.dispenseStatus === "PARTIALLY_DISPENSED";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md shadow-emerald-200">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Dispense Medication</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Update dispense status for this prescription
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Medication summary */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-purple-500" />
            <span className="font-bold text-slate-800">
              {prescription.medicationName}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Dosage</span>
              <p className="font-semibold text-slate-700">
                {prescription.dosage}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Frequency</span>
              <p className="font-semibold text-slate-700">
                {prescription.frequency}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Duration</span>
              <p className="font-semibold text-slate-700">
                {prescription.duration}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-200">
            Patient:{" "}
            <span className="font-semibold text-slate-700">
              {prescription.patient.firstName} {prescription.patient.lastName}
            </span>
            {" · "}
            {prescription.patient.patientNumber}
          </div>
        </div>

        {/* Status selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            Dispense Status <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {/* Full dispense */}
            <button
              type="button"
              onClick={() => setSelectedStatus("DISPENSED")}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                selectedStatus === "DISPENSED"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-emerald-200"
              }`}
            >
              <CheckCircle
                className={`h-5 w-5 ${selectedStatus === "DISPENSED" ? "text-emerald-600" : "text-slate-300"}`}
              />
              <div>
                <p
                  className={`text-xs font-semibold ${selectedStatus === "DISPENSED" ? "text-emerald-700" : "text-slate-600"}`}
                >
                  Fully Dispensed
                </p>
                <p className="text-[10px] text-slate-400">
                  All medication given
                </p>
              </div>
            </button>

            {/* Partial dispense */}
            {(isPartial || prescription.dispenseStatus === "PENDING") && (
              <button
                type="button"
                onClick={() => setSelectedStatus("PARTIALLY_DISPENSED")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedStatus === "PARTIALLY_DISPENSED"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200"
                }`}
              >
                <RefreshCw
                  className={`h-5 w-5 ${selectedStatus === "PARTIALLY_DISPENSED" ? "text-blue-600" : "text-slate-300"}`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold ${selectedStatus === "PARTIALLY_DISPENSED" ? "text-blue-700" : "text-slate-600"}`}
                  >
                    Partial
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Some given, more needed
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Dispensing Notes{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (error) setError("");
            }}
            placeholder="Any notes about the dispensing (e.g., brand substitution, counselling given)..."
            className="resize-none text-sm"
            rows={3}
            disabled={isLoading}
          />
          <p className="text-xs text-slate-400">
            {notes.length}/500 characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Dispense
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
