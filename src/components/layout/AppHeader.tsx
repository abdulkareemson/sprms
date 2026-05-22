// src/components/layout/AppHeader.tsx

"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Settings, User, Bell } from "lucide-react";
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

export function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();

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
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      {/* Mobile menu */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-0">
            <MobileNav />
          </SheetContent>
        </Sheet>
      </div>

      {/* SPRMS title — mobile only */}
      <div className="lg:hidden flex items-center gap-2">
        <span className="text-lg">🏥</span>
        <p className="font-bold text-slate-800">SPRMS</p>
      </div>

      {/* Breadcrumb area — desktop */}
      <div className="hidden lg:block">
        <p className="text-sm text-slate-400">
          Welcome back,{" "}
          <span className="text-slate-700 font-medium">{name}</span>
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="p-2 relative hover:bg-slate-100 rounded-xl"
        >
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-slate-100 rounded-xl"
            >
              <Avatar className="h-8 w-8 ring-2 ring-blue-100">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-700 leading-none">
                  {name}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {session?.user?.role?.replace("_", " ")}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl shadow-lg"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <p className="text-sm font-medium text-slate-700">{name}</p>
              <p className="text-xs text-slate-400">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="px-3 py-2 cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="px-3 py-2 cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="px-3 py-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
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
