// src/components/shared/UserAvatar.tsx

"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  /** Full name — used to derive initials */
  name: string;
  /** Optional uploaded photo URL */
  src?: string | null;
  size?: AvatarSize;
  /** Force showing the generic avatar image instead of initials */
  useImage?: boolean;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, { box: string; text: string; px: number }> =
  {
    xs: { box: "w-7 h-7", text: "text-[10px]", px: 28 },
    sm: { box: "w-9 h-9", text: "text-xs", px: 36 },
    md: { box: "w-12 h-12", text: "text-sm", px: 48 },
    lg: { box: "w-16 h-16", text: "text-xl", px: 64 },
    xl: { box: "w-24 h-24", text: "text-3xl", px: 96 },
  };

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({
  name,
  src,
  size = "md",
  useImage = false,
  className,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const s = SIZE_MAP[size];
  const initials = getInitials(name);

  // Priority 1 — uploaded photo (if provided and not broken)
  if (src && !imgFailed) {
    return (
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden flex-shrink-0",
          "ring-1 ring-slate-200 bg-slate-100",
          s.box,
          className,
        )}
      >
        <Image
          src={src}
          alt={name}
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // Priority 2 — generic default avatar image
  if (useImage) {
    return (
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden flex-shrink-0",
          "ring-1 ring-slate-200 bg-slate-100",
          s.box,
          className,
        )}
      >
        <Image
          src="/images/default-avatar.png"
          alt={name}
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Priority 3 — gradient initials fallback
  return (
    <div
      className={cn(
        "rounded-2xl flex-shrink-0 flex items-center justify-center",
        "bg-gradient-to-br from-blue-500 to-blue-700",
        "text-white font-bold shadow-sm",
        s.box,
        s.text,
        className,
      )}
    >
      {initials}
    </div>
  );
}
