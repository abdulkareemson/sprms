// src/app/(auth)/layout.tsx

import Link from "next/link";
import { Shield, Activity, Lock, Users } from "lucide-react";

// ─── Feature pill ─────────────────────────────────────────────────────────────

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-xs text-white/90 font-medium">
      <Icon className="h-3 w-3 text-blue-200" />
      {label}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — Branding ───────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />

          {/* Grid pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
              <span className="text-2xl">🏥</span>
            </div>
            <div>
              <p className="text-white font-bold text-xl tracking-wide">
                SPRMS
              </p>
              <p className="text-blue-300 text-xs">
                Secure Patient Record Management
              </p>
            </div>
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Healthcare Records
              <br />
              <span className="text-blue-300">Made Secure.</span>
            </h1>
            <p className="text-blue-200/80 text-base mt-4 max-w-sm leading-relaxed">
              A next-generation electronic health record system built for Ahmadu
              Bello University Teaching Hospital, Zaria.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            <FeaturePill icon={Shield} label="End-to-End Encrypted" />
            <FeaturePill icon={Lock} label="Role-Based Access" />
            <FeaturePill icon={Users} label="Multi-Role Support" />
            <FeaturePill icon={Activity} label="Real-Time Audit Trail" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {[
              { value: "6", label: "User Roles" },
              { value: "7", label: "Modules" },
              { value: "AES-256", label: "Encryption" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-blue-300 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-blue-400/60 text-xs">
            © {new Date().getFullYear()} Ahmadu Bello University, Zaria
            <br />
            Computer Science Final Year Project
          </p>
        </div>
      </div>

      {/* ── Right Panel — Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 p-4 border-b border-slate-100 bg-white">
          <span className="text-xl">🏥</span>
          <span className="font-bold text-slate-800">SPRMS</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
          <div className="w-full max-w-md animate-fade-in">
            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
              {children}
            </div>

            {/* Institution badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="h-3 w-3" />
              <span>Secured by SPRMS · ABU Zaria · CS Final Year Project</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
