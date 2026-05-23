//src/components/shared/PageHeader.tsx

import { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  action,
  backHref,
}: PageHeaderProps) {
  return (
    <div className="px-4 sm:px-6 py-4 mb-2">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
