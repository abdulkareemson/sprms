// src/components/shared/PageHeader.tsx

import { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
  badge?: ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
  backHref,
  badge,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </Link>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {action}
          </div>
        )}
      </div>

      {/* Subtle decorative line */}
      <div className="mt-4 h-px bg-gradient-to-r from-blue-200/60 via-slate-200 to-transparent" />
    </div>
  );
}