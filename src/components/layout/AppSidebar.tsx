// src/components/layout/AppSidebar.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Pill,
  Receipt,
  BarChart3,
  Shield,
  Settings,
  ClipboardList,
  LogOut,
  ChevronRight,
} from "lucide-react";

// ─── Branding ─────────────────────────────────────────────────────────────────

const HOSPITAL_NAME    = "Muslim Specialist Hospital";
const HOSPITAL_CITY    = "Zaria";
const HOSPITAL_TAGLINE = "Danmagaji, Zaria";

// ─── Nav Items ────────────────────────────────────────────────────────────────

interface NavItem {
  label  : string;
  href   : string;
  icon   : React.ElementType;
  roles  : Role[];
  badge? : string;
}

const navItems: NavItem[] = [
  {
    label : "Dashboard",
    href  : "/dashboard",
    icon  : LayoutDashboard,
    roles : [
      Role.ADMIN,
      Role.DOCTOR,
      Role.NURSE,
      Role.RECEPTIONIST,
      Role.PHARMACIST,
      Role.PATIENT,
    ],
  },
  {
    label : "Patients",
    href  : "/patients",
    icon  : Users,
    roles : [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST],
  },
  {
    label : "Appointments",
    href  : "/appointments",
    icon  : Calendar,
    roles : [
      Role.ADMIN,
      Role.DOCTOR,
      Role.NURSE,
      Role.RECEPTIONIST,
      Role.PATIENT,
    ],
  },
  {
    label : "My Records",
    href  : "/my-records",
    icon  : FileText,
    roles : [Role.PATIENT],
  },
  {
    label : "Pharmacy",
    href  : "/pharmacy",
    icon  : Pill,
    roles : [Role.ADMIN, Role.PHARMACIST],
  },
  {
    label : "Billing",
    href  : "/billing",
    icon  : Receipt,
    roles : [Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT],
  },
  {
    label : "Reports",
    href  : "/reports",
    icon  : BarChart3,
    roles : [Role.ADMIN, Role.DOCTOR],
  },
  {
    label : "Staff",
    href  : "/staff",
    icon  : ClipboardList,
    roles : [Role.ADMIN],
  },
  {
    label : "Audit Logs",
    href  : "/audit-logs",
    icon  : Shield,
    roles : [Role.ADMIN],
  },
  {
    label : "Settings",
    href  : "/settings",
    icon  : Settings,
    roles : [
      Role.ADMIN,
      Role.DOCTOR,
      Role.NURSE,
      Role.RECEPTIONIST,
      Role.PHARMACIST,
      Role.PATIENT,
    ],
  },
];

// ─── Role color map ───────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN        : "bg-red-500/15 text-red-300 border-red-500/25",
  DOCTOR       : "bg-blue-500/15 text-blue-300 border-blue-500/25",
  NURSE        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  RECEPTIONIST : "bg-violet-500/15 text-violet-300 border-violet-500/25",
  PHARMACIST   : "bg-amber-500/15 text-amber-300 border-amber-500/25",
  PATIENT      : "bg-teal-500/15 text-teal-300 border-teal-500/25",
};

const ROLE_DOT: Record<string, string> = {
  ADMIN        : "bg-red-400",
  DOCTOR       : "bg-blue-400",
  NURSE        : "bg-emerald-400",
  RECEPTIONIST : "bg-violet-400",
  PHARMACIST   : "bg-amber-400",
  PATIENT      : "bg-teal-400",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname   = usePathname();
  const { data: session } = useSession();
  const userRole   = session?.user?.role as Role;

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const name     = session?.user?.name ?? "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleColor = ROLE_COLORS[userRole] ?? ROLE_COLORS.PATIENT;
  const roleDot   = ROLE_DOT[userRole]    ?? "bg-blue-400";

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-sidebar-gradient min-h-screen relative">
      {/* Subtle right border glow */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />

      {/* ── Logo / Hospital Identity ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5">
        {/* Hospital logo */}
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
          <Image
            src="/msh-logo.png"
            alt="Muslim Specialist Hospital, Zaria"
            width={44}
            height={44}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Hospital name text */}
        <div className="min-w-0">
          <p className="text-white font-bold text-[13px] leading-tight truncate">
            {HOSPITAL_NAME}
          </p>
          <p className="text-slate-400 text-[10px] leading-tight mt-0.5">
            {HOSPITAL_CITY} · SPRMS
          </p>
        </div>
      </div>

      {/* ── Role badge ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-semibold",
            "px-2.5 py-1 rounded-lg border",
            roleColor,
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              roleDot,
            )}
          />
          {userRole?.replace("_", " ")}
        </span>
      </div>

      {/* Divider */}
      <div className="hc-divider mx-4 my-0 opacity-30" />

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item, index) => {
          const Icon     = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ animationDelay: `${index * 30}ms` }}
              className={cn(
                "sidebar-link group animate-slide-left",
                isActive ? "sidebar-link-active" : "sidebar-link-idle",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110",
                )}
              />
              <span className="flex-1 text-sm">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-3 w-3 opacity-60" />
              )}
              {item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="hc-divider mx-4 my-0 opacity-30" />

      {/* ── User section ─────────────────────────────────────────────────── */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate leading-none">
              {name}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {session?.user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl",
            "text-sm text-slate-400 hover:text-red-400",
            "hover:bg-red-500/10 transition-all duration-200",
            "group",
          )}
        >
          <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          Sign Out
        </button>
      </div>

      {/* ── Bottom tagline ───────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <p className="text-[9px] text-slate-600 text-center leading-relaxed">
          {HOSPITAL_TAGLINE}
        </p>
      </div>
    </aside>
  );
}