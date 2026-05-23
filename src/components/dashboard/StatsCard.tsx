// src/components/dashboard/StatsCard.tsx

import { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  color?: "blue" | "green" | "orange" | "purple" | "red" | "teal";
  className?: string;
}

const colorMap = {
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700",
    gradient: "from-blue-500/5",
  },
  green: {
    icon: "bg-emerald-500/10 text-emerald-600",
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    gradient: "from-emerald-500/5",
  },
  orange: {
    icon: "bg-amber-500/10 text-amber-600",
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-700",
    gradient: "from-amber-500/5",
  },
  purple: {
    icon: "bg-violet-500/10 text-violet-600",
    border: "border-l-violet-500",
    badge: "bg-violet-50 text-violet-700",
    gradient: "from-violet-500/5",
  },
  red: {
    icon: "bg-red-500/10 text-red-600",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700",
    gradient: "from-red-500/5",
  },
  teal: {
    icon: "bg-teal-500/10 text-teal-600",
    border: "border-l-teal-500",
    badge: "bg-teal-50 text-teal-700",
    gradient: "from-teal-500/5",
  },
};
// NOTE: No "use client" — this is intentionally a Server Component
// so it can safely receive Lucide icon components as props from
// parent Server Components like dashboard/page.tsx

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "blue",
  className,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={[
        "bg-white rounded-2xl border border-slate-200 border-l-4 p-5",
        "shadow-sm hover:shadow-md transition-all duration-200",
        `bg-gradient-to-br ${colors.gradient} to-transparent`,
        colors.border,
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1.5 leading-none">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-1.5">{description}</p>
          )}
          {trend && (
            <div
              className={[
                "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                trend.value >= 0 ? colors.badge : "bg-red-50 text-red-700",
              ].join(" ")}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              {trend.label}
            </div>
          )}
        </div>
        <div
          className={[
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            colors.icon,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
