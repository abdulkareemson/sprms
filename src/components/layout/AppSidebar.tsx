//src/components/layout/AppSidebar.tsx

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
  UserCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
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
    label: "Medical Records",
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
    label: "Staff Management",
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
    label: "My Profile",
    href: "/settings",
    icon: UserCircle,
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
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: [Role.ADMIN],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role;

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  // Remove duplicate Settings/My Profile for admin
  const uniqueItems = visibleItems.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.href === item.href),
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          🏥
        </div>
        <div>
          <p className="text-white font-bold text-sm">SPRMS</p>
          <p className="text-slate-400 text-xs">ABU Zaria</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-6 py-3">
        <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-medium px-2 py-1 rounded">
          {userRole?.replace("_", " ")}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {uniqueItems.map((item) => {
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
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-400 text-xs truncate">
          {session?.user?.email}
        </p>
      </div>
    </aside>
  );
}
