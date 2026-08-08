// src/app/(auth)/layout.tsx

import Link from "next/link";
import Image from "next/image";
import { Shield, Activity, Lock, Users } from "lucide-react";

// ─── Branding Constants ───────────────────────────────────────────────────────

const HOSPITAL_NAME = "Muslim Specialist Hospital, Zaria";
const HOSPITAL_ADDRESS = "Danmagaji, Tukur Tukur, Zaria, Kaduna State";
const APP_NAME = "Secure Patient Record Management System";

// ─── Feature Pill Component ───────────────────────────────────────────────────

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-xs text-white/90 font-medium transition-all duration-200 hover:bg-white/20">
      <Icon className="h-3.5 w-3.5 text-blue-200" />
      {label}
    </div>
  );
}

// ─── Layout Component ─────────────────────────────────────────────────────────

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — Branding ───────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between p-12 overflow-hidden bg-slate-950">
        {/* ── Background Hero Image ── */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/auth-hero.jpg"
            alt="Muslim Specialist Hospital Clinical Operations"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center opacity-90 select-none pointer-events-none"
          />
          {/* Subtle blue-to-slate gradient overlay for perfect readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-950/90 to-slate-950/95 mix-blend-multiply" />
        </div>

        {/* Ambient Blur decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 opacity-60">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        {/* ── Top: Hospital Logo + Name ── */}
        <div className="relative z-20">
          <Link href="/" className="flex items-center gap-4 group w-fit">
            {/* White rounded background for high-contrast logo display */}
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 overflow-hidden flex-shrink-0 group-hover:shadow-blue-500/20 transition-all duration-300">
              <Image
                src="/msh-logo.png"
                alt="Muslim Specialist Hospital logo"
                width={64}
                height={64}
                className="w-full h-full object-contain p-1"
                priority
              />
            </div>

            <div>
              <p className="text-white font-bold text-lg leading-tight tracking-wide">
                {HOSPITAL_NAME}
              </p>
              <p className="text-blue-300 text-xs mt-0.5 leading-tight font-medium">
                {APP_NAME}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Middle: Hero content ── */}
        <div className="relative z-20 space-y-6 my-auto">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Healthcare Records
              <br />
              <span className="text-blue-300">Made Secure.</span>
            </h1>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 max-w-md pt-2">
            <FeaturePill icon={Shield} label="End-to-End Encrypted" />
            <FeaturePill icon={Lock} label="Role-Based Access" />
            <FeaturePill icon={Users} label="Multi-Role Support" />
            <FeaturePill icon={Activity} label="Real-Time Audit Trail" />
          </div>
        </div>

        {/* ── Bottom: Footer ── */}
        <div className="relative z-20 space-y-1 pt-6 border-t border-white/10">
          <p className="text-blue-400/80 text-xs font-semibold uppercase tracking-wider">
            Case Study Site
          </p>
          <p className="text-white/80 text-xs leading-relaxed">
            {HOSPITAL_ADDRESS}
          </p>
          <p className="text-blue-400/40 text-xs pt-1">
            © {new Date().getFullYear()} Ahmadu Bello University, Zaria
            &nbsp;·&nbsp; Computer Science Final Year Project
          </p>
        </div>
      </div>

      {/* ── Right Panel — Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header — shown on small viewports only */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-slate-100 bg-white">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 shadow-sm">
            <Image
              src="/msh-logo.png"
              alt="Muslim Specialist Hospital logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">
              {HOSPITAL_NAME}
            </p>
            <p className="text-slate-400 text-[10px] leading-tight mt-0.5">
              SPRMS
            </p>
          </div>
        </div>

        {/* Form rendering wrapper area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
          <div className="w-full max-w-md animate-fade-in">
            {/* Main authentication form card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
              {children}
            </div>

            {/* Verification badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5 text-slate-300" />
              <span>Secured by SPRMS · {HOSPITAL_NAME} · ABU Zaria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
