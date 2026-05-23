// src/components/appointments/CancelDialog.tsx

"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  appointmentInfo?: string;
}

export function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
  appointmentInfo,
}: CancelDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (reason.trim().length < 5) {
      setError("Please provide a reason (at least 5 characters)");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch {
      setError("Failed to cancel appointment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-lg">Cancel Appointment</DialogTitle>
          </div>
          <DialogDescription>
            {appointmentInfo
              ? `You are about to cancel: ${appointmentInfo}`
              : "You are about to cancel this appointment."}{" "}
            A cancellation email will be sent to the patient.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-sm font-medium text-slate-700">
            Cancellation Reason <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="Please provide a reason for cancellation..."
            className={`resize-none ${error ? "border-red-400" : ""}`}
            rows={3}
            disabled={isLoading}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-slate-400">
            {reason.length}/500 characters
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setReason("");
              setError("");
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            Keep Appointment
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || reason.trim().length < 5}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
