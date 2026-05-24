// src/components/shared/ConfirmDialog.tsx

"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // "destructive" kept as alias for backward compatibility
  variant?: "danger" | "destructive" | "warning" | "default";
  // isLoading can be controlled externally (optional)
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

// ─── Variant map ──────────────────────────────────────────────────────────────

const variantMap = {
  danger: {
    icon: "bg-red-100 text-red-600",
    button: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
  },
  // "destructive" is identical to "danger" — backward compatibility
  destructive: {
    icon: "bg-red-100 text-red-600",
    button: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
  },
  warning: {
    icon: "bg-amber-100 text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white",
  },
  default: {
    icon: "bg-blue-100 text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading: externalLoading,
  onConfirm,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  // External isLoading overrides internal if provided
  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    // Only manage internal loading if no external control
    if (externalLoading === undefined) {
      setInternalLoading(true);
    }
    try {
      await onConfirm();
    } finally {
      if (externalLoading === undefined) {
        setInternalLoading(false);
        onOpenChange(false);
      }
    }
  };

  const v = variantMap[variant] ?? variantMap.danger;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border border-slate-200 shadow-xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                v.icon,
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle className="text-base font-semibold text-slate-900">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-500 mt-1 leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 mt-2">
          <AlertDialogCancel
            disabled={isLoading}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading}
            className={cn("rounded-xl gap-2", v.button)}
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isLoading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}