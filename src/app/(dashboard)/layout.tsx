//src/app/(dashboard)/layout.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-slate-50">
          {/* Sidebar */}
          <AppSidebar />

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
