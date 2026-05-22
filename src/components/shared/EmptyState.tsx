//src/components/shared/EmptyState.tsx

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-slate-700 font-medium text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-slate-400 text-sm max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-blue-700 hover:bg-blue-800">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
