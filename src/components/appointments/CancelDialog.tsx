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
  intent?: "cancel" | "reject";
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  appointmentInfo?: string;
}

export function CancelDialog({
  open,
  intent = "cancel",
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update appointment. Please try again.",
      );
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
            <DialogTitle className="text-lg">
              {intent === "reject"
                ? "Reject Appointment Request"
                : "Cancel Appointment"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {appointmentInfo
              ? `You are about to ${intent === "reject" ? "reject the request for" : "cancel"}: ${appointmentInfo}`
              : `You are about to ${intent === "reject" ? "reject this appointment request" : "cancel this appointment"}.`}{" "}
            The patient will be notified by email if an address is available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-sm font-medium text-slate-700">
            {intent === "reject" ? "Rejection Reason" : "Cancellation Reason"}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder={
              intent === "reject"
                ? "Why are you rejecting this appointment request?"
                : "Please provide a reason for cancellation..."
            }
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
            {intent === "reject" ? "Keep Request" : "Keep Appointment"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || reason.trim().length < 5}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {intent === "reject" ? "Rejecting..." : "Cancelling..."}
              </>
            ) : intent === "reject" ? (
              "Reject Request"
            ) : (
              "Confirm Cancellation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
