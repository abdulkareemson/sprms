//src/components/layout/MobileNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <span className="text-xl">🏥</span>
        <div>
          <p className="text-white font-bold text-sm">SPRMS</p>
          <p className="text-slate-400 text-xs">ABU Zaria</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-400 text-xs">{session?.user?.email}</p>
      </div>
    </div>
  );
}
