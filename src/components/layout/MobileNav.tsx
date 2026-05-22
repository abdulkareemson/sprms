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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
          🏥
        </div>
        <div>
          <p className="text-white font-bold">SPRMS</p>
          <p className="text-slate-400 text-xs">ABU Zaria</p>
        </div>
      </div>

      {/* Role */}
      <div className="px-6 pb-3">
        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          {userRole?.replace("_", " ")}
        </span>
      </div>

      <div className="h-px bg-slate-700/50 mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="h-px bg-slate-700/50 mx-4" />

      {/* User + Logout */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 mb-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
