// src/components/dashboard/WelcomeBanner.tsx

import Image from "next/image";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WelcomeBannerProps {
  /** User's first name — displayed in the greeting */
  name        : string;
  /** Optional prefix e.g. "Dr." */
  prefix?     : string;
  /** Subtitle line shown under the greeting */
  subtitle?   : string;
  /** Emoji shown after the name */
  emoji?      : string;
  /** Show the "System Active" pill (Admin only) */
  showStatus? : boolean;
  className?  : string;
}

export function WelcomeBanner({
  name,
  prefix     = "",
  subtitle,
  emoji      = "👋",
  showStatus = false,
  className,
}: WelcomeBannerProps) {
  const displayName = prefix ? `${prefix} ${name}` : name;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "shadow-lg shadow-slate-900/10",
        className,
      )}
    >
      {/* Background image */}
      <Image
        src="/images/dashboard-banner.jpg"
        alt="Muslim Specialist Hospital, Zaria"
        fill
        className="object-cover object-center"
        priority
        quality={85}
        sizes="100vw"
      />

      {/* Gradient overlay — keeps text readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 via-blue-800/85 to-blue-700/50" />

      {/* Subtle decorative orb */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative flex items-center justify-between gap-4 px-6 py-7 sm:px-8 sm:py-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
            {displayName} {emoji}
          </h1>
          <p className="text-blue-100/90 text-xs sm:text-sm mt-1.5">
            {subtitle ?? format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <p className="text-blue-200/60 text-[10px] sm:text-[11px] mt-2 font-medium tracking-wide">
            Muslim Specialist Hospital, Zaria · Danmagaji, Tukur Tukur
          </p>
        </div>

        {showStatus && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            System Active
          </div>
        )}
      </div>
    </div>
  );
}