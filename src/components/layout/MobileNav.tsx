// src/components/layout/MobileNav.tsx

"use client";

import Link from "next/link";
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

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      Role.ADMIN,
      Role.DOCTOR,
      Role.NURSE,
      Role.RECEPTIONIST,
      Role.PHARMACIST,
      Role.PATIENT,
    ],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    roles: [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST],
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: Calendar,
    roles: [
      Role.ADMIN,
      Role.DOCTOR,
      Role.NURSE,
      Role.RECEPTIONIST,
      Role.PATIENT,
    ],
  },
  {
    label: "My Records",
    href: "/my-records",
    icon: FileText,
    roles: [Role.PATIENT],
  },
  {
    label: "Pharmacy",
    href: "/pharmacy",
    icon: Pill,
    roles: [Role.ADMIN, Role.PHARMACIST],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    roles: [Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: [Role.ADMIN, Role.DOCTOR],
  },
  {
    label: "Staff",
    href: "/staff",
    icon: ClipboardList,
    roles: [Role.ADMIN],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: Shield,
    roles: [Role.ADMIN],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: [
      Role.ADMIN,
      Role.DOCTOR,
      Role.NURSE,
      Role.RECEPTIONIST,
      Role.PHARMACIST,
      Role.PATIENT,
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-500/15 text-red-300 border-red-500/25",
  DOCTOR: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  NURSE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  RECEPTIONIST: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  PHARMACIST: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  PATIENT: "bg-teal-500/15 text-teal-300 border-teal-500/25",
};

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role;

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  const name = session?.user?.name ?? "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleColor = ROLE_COLORS[userRole] ?? ROLE_COLORS.PATIENT;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-blue-500/25">
          🏥
        </div>
        <div>
          <p className="text-white font-bold">SPRMS</p>
          <p className="text-slate-400 text-xs">ABU Zaria</p>
        </div>
      </div>

      {/* Role */}
      <div className="px-5 pb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
            roleColor,
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
          {userRole?.replace("_", " ")}
        </span>
      </div>

      <div className="h-px bg-white/5 mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link group", // ← "group" here directly
                isActive ? "sidebar-link-active" : "sidebar-link-idle",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-sm">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="h-px bg-white/5 mx-4" />

      {/* User + Logout */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
        >
          <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
