// src/components/shared/EmptyState.tsx

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Illustration Variants ────────────────────────────────────────────────────

export type EmptyIllustration =
  | "patients"
  | "records"
  | "appointments"
  | "prescriptions"
  | "invoices"
  | "documents"
  | "audit"
  | "reports"
  | "search";

interface IllustrationProps {
  className?: string;
}

/* Shared SVG wrapper props for consistent line-art style */
const svgBase = {
  viewBox: "0 0 120 120",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ILLUSTRATIONS: Record<
  EmptyIllustration,
  (p: IllustrationProps) => JSX.Element
> = {
  // ── Patients — person + magnifier ──────────────────────────────────────
  patients: ({ className }) => (
    <svg {...svgBase} className={className}>
      <circle cx="52" cy="42" r="16" stroke="currentColor" strokeWidth="3" />
      <path
        d="M26 88c0-14 12-24 26-24s26 10 26 24"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle
        cx="82"
        cy="76"
        r="15"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-40"
      />
      <path
        d="M93 87l10 10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-40"
      />
    </svg>
  ),

  // ── Records — clipboard + medical cross ────────────────────────────────
  records: ({ className }) => (
    <svg {...svgBase} className={className}>
      <rect
        x="30"
        y="24"
        width="60"
        height="72"
        rx="6"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect
        x="46"
        y="16"
        width="28"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M60 48v24M48 60h24"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-50"
      />
    </svg>
  ),

  // ── Appointments — calendar + clock ────────────────────────────────────
  appointments: ({ className }) => (
    <svg {...svgBase} className={className}>
      <rect
        x="22"
        y="28"
        width="62"
        height="58"
        rx="6"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M22 46h62M38 20v14M68 20v14"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle
        cx="86"
        cy="80"
        r="18"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-40"
      />
      <path
        d="M86 71v9l6 4"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-40"
      />
    </svg>
  ),

  // ── Prescriptions — pill bottle + capsule ──────────────────────────────
  prescriptions: ({ className }) => (
    <svg {...svgBase} className={className}>
      <rect
        x="32"
        y="34"
        width="38"
        height="56"
        rx="6"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect
        x="27"
        y="22"
        width="48"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M51 52v20M41 62h20"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-50"
      />
      <rect
        x="76"
        y="62"
        width="26"
        height="14"
        rx="7"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-40"
        transform="rotate(-35 76 62)"
      />
    </svg>
  ),

  // ── Invoices — receipt with ₦ ─────────────────────────────────────────
  invoices: ({ className }) => (
    <svg {...svgBase} className={className}>
      <path
        d="M32 18h56v84l-9-6-9 6-10-6-10 6-9-6-9 6V18z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M46 40h28M46 54h28M46 68h16"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-45"
      />
    </svg>
  ),

  // ── Documents — folder + cross ─────────────────────────────────────────
  documents: ({ className }) => (
    <svg {...svgBase} className={className}>
      <path
        d="M20 34a6 6 0 016-6h20l8 10h26a6 6 0 016 6v42a6 6 0 01-6 6H26a6 6 0 01-6-6V34z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M60 56v22M49 67h22"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-45"
      />
    </svg>
  ),

  // ── Audit — shield + log lines ─────────────────────────────────────────
  audit: ({ className }) => (
    <svg {...svgBase} className={className}>
      <path
        d="M60 16l30 12v24c0 22-13 36-30 44-17-8-30-22-30-44V28l30-12z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M48 52h24M48 64h24M48 76h14"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-45"
      />
    </svg>
  ),

  // ── Reports — bar chart ────────────────────────────────────────────────
  reports: ({ className }) => (
    <svg {...svgBase} className={className}>
      <path d="M22 96h76" stroke="currentColor" strokeWidth="3" />
      <rect
        x="32"
        y="62"
        width="14"
        height="34"
        rx="3"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect
        x="53"
        y="42"
        width="14"
        height="54"
        rx="3"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-70"
      />
      <rect
        x="74"
        y="26"
        width="14"
        height="70"
        rx="3"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-45"
      />
    </svg>
  ),

  // ── Search — magnifier + dashed circle ─────────────────────────────────
  search: ({ className }) => (
    <svg {...svgBase} className={className}>
      <circle cx="52" cy="52" r="26" stroke="currentColor" strokeWidth="3" />
      <path d="M71 71l22 22" stroke="currentColor" strokeWidth="3" />
      <path
        d="M42 52h20"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-45"
      />
    </svg>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Lucide icon — used when no illustration is given */
  icon?: LucideIcon;
  /** SVG illustration key — takes priority over icon */
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  illustration,
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
      iconIn: "h-6 w-6",
      illus: "w-20 h-20",
      title: "text-base",
      desc: "text-xs",
    },
    md: {
      wrapper: "py-16",
      icon: "w-16 h-16",
      iconIn: "h-7 w-7",
      illus: "w-28 h-28",
      title: "text-lg",
      desc: "text-sm",
    },
    lg: {
      wrapper: "py-24",
      icon: "w-20 h-20",
      iconIn: "h-9 w-9",
      illus: "w-36 h-36",
      title: "text-xl",
      desc: "text-sm",
    },
  };

  const s = sizeMap[size];
  const Illustration = illustration ? ILLUSTRATIONS[illustration] : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        s.wrapper,
        className,
      )}
    >
      {/* Priority 1 — SVG illustration */}
      {Illustration && (
        <div className="relative mb-5">
          {/* Soft glow behind illustration */}
          <div className="absolute inset-0 bg-blue-100/40 blur-2xl rounded-full scale-75" />
          <Illustration className={cn("relative text-slate-300", s.illus)} />
        </div>
      )}

      {/* Priority 2 — Lucide icon fallback */}
      {!Illustration && Icon && (
        <div
          className={cn(
            "rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50",
            "flex items-center justify-center mb-4",
            "border border-slate-200 shadow-sm",
            s.icon,
          )}
        >
          <Icon className={cn("text-slate-400", s.iconIn)} />
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
