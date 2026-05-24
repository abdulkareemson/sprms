// src/components/shared/EmptyState.tsx

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeMap = {
    sm: {
      wrapper: "py-10",
      icon: "w-12 h-12",
      iconInner: "h-6 w-6",
      title: "text-base",
      desc: "text-xs",
    },
    md: {
      wrapper: "py-16",
      icon: "w-16 h-16",
      iconInner: "h-7 w-7",
      title: "text-lg",
      desc: "text-sm",
    },
    lg: {
      wrapper: "py-24",
      icon: "w-20 h-20",
      iconInner: "h-9 w-9",
      title: "text-xl",
      desc: "text-sm",
    },
  };

  const s = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        s.wrapper,
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50",
            "flex items-center justify-center mb-4",
            "border border-slate-200 shadow-sm",
            s.icon,
          )}
        >
          <Icon className={cn("text-slate-400", s.iconInner)} />
        </div>
      )}

      <h3 className={cn("font-semibold text-slate-700 mb-1.5", s.title)}>
        {title}
      </h3>

      {description && (
        <p
          className={cn("text-slate-400 max-w-sm mb-5 leading-relaxed", s.desc)}
        >
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 gap-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
