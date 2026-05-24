// src/components/layout/AppHeader.tsx

"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  LogOut,
  Settings,
  User,
  Bell,
  ChevronRight,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb() {
  const pathname = usePathname();

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href: "/" + arr.slice(0, i + 1).join("/"),
      isLast: i === arr.length - 1,
      // Hide IDs (cuid format)
      isId: seg.length > 20 && !seg.includes("-"),
    }))
    .filter((s) => !s.isId);

  if (segments.length <= 1) return null;

  return (
    <nav className="hidden md:flex items-center gap-1 text-xs text-slate-400">
      <Home className="h-3 w-3" />
      {segments.map((seg) => (
        <span key={seg.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span
            className={cn(
              seg.isLast
                ? "text-slate-700 font-semibold"
                : "hover:text-slate-600 cursor-pointer transition-colors",
            )}
          >
            {seg.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

// ─── Role color map ───────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700 border-red-200",
  DOCTOR: "bg-blue-50 text-blue-700 border-blue-200",
  NURSE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECEPTIONIST: "bg-violet-50 text-violet-700 border-violet-200",
  PHARMACIST: "bg-amber-50 text-amber-700 border-amber-200",
  PATIENT: "bg-teal-50 text-teal-700 border-teal-200",
};

const AVATAR_GRADIENT: Record<string, string> = {
  ADMIN: "from-red-500 to-red-700",
  DOCTOR: "from-blue-500 to-blue-700",
  NURSE: "from-emerald-500 to-emerald-700",
  RECEPTIONIST: "from-violet-500 to-violet-700",
  PHARMACIST: "from-amber-500 to-amber-700",
  PATIENT: "from-teal-500 to-teal-700",
};

// ─── Header ───────────────────────────────────────────────────────────────────

export function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  const name = session?.user?.name ?? "User";
  const role = session?.user?.role ?? "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleBadge = ROLE_BADGE[role] ?? ROLE_BADGE.PATIENT;
  const avatarGradient = AVATAR_GRADIENT[role] ?? AVATAR_GRADIENT.PATIENT;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <header
      className={cn(
        "h-14 sm:h-16 sticky top-0 z-40",
        "bg-white/90 backdrop-blur-md",
        "border-b border-slate-200/80",
        "flex items-center justify-between",
        "px-4 sm:px-6",
        "shadow-sm shadow-slate-100/50",
      )}
    >
      {/* Left — Mobile hamburger */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0 bg-slate-900 border-0"
            >
              <MobileNav />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <span className="text-lg">🏥</span>
          <p className="font-bold text-slate-800 text-sm">SPRMS</p>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden lg:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-xl",
                "hover:bg-slate-100 transition-colors",
                "focus-visible:ring-2 focus-visible:ring-blue-500",
              )}
            >
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback
                  className={cn(
                    "bg-gradient-to-br text-white text-xs font-bold",
                    avatarGradient,
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-700 leading-none">
                  {name.split(" ")[0]}
                </p>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-md border mt-0.5 inline-block",
                    roleBadge,
                  )}
                >
                  {role.replace("_", " ")}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl shadow-lg border border-slate-200 p-1"
          >
            <DropdownMenuLabel className="px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {session?.user?.email}
              </p>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-md border mt-1.5 inline-block",
                  roleBadge,
                )}
              >
                {role.replace("_", " ")}
              </span>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="px-3 py-2 rounded-lg cursor-pointer text-sm"
            >
              <User className="mr-2 h-4 w-4 text-slate-400" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="px-3 py-2 rounded-lg cursor-pointer text-sm"
            >
              <Settings className="mr-2 h-4 w-4 text-slate-400" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="px-3 py-2 rounded-lg cursor-pointer text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
