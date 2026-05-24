// src/app/(dashboard)/settings/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Save,
  Lock,
  User,
  Mail,
  Shield,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/schemas/auth.schema";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Role badge color ─────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-700 border-red-200",
  DOCTOR: "bg-blue-50 text-blue-700 border-blue-200",
  NURSE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECEPTIONIST: "bg-violet-50 text-violet-700 border-violet-200",
  PHARMACIST: "bg-amber-50 text-amber-700 border-amber-200",
  PATIENT: "bg-teal-50 text-teal-700 border-teal-200",
};

// ─── Profile Info Row ─────────────────────────────────────────────────────────

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully!");
        reset();
      } else {
        setError(result.error ?? "Failed to change password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const mustChange = session?.user?.mustChangePassword;
  const role = session?.user?.role ?? "";
  const roleBadge = ROLE_BADGE[role] ?? ROLE_BADGE.PATIENT;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account profile and security"
      />

      {/* Must-change banner */}
      {mustChange && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Password change required
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              You must change your password before accessing other parts of the
              system.
            </p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-1">
          <ProfileRow
            icon={User}
            label="Full Name"
            value={session?.user?.name ?? "—"}
          />
          <ProfileRow
            icon={Mail}
            label="Email Address"
            value={session?.user?.email ?? "—"}
          />
          <div className="flex items-center gap-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                System Role
              </p>
              <span
                className={cn(
                  "inline-block text-xs font-semibold px-2.5 py-0.5 rounded-lg border mt-1",
                  roleBadge,
                )}
              >
                {role.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Email verification status */}
          <div className="flex items-center gap-2 py-3 border-t border-slate-50">
            {session?.user?.isEmailVerified ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-emerald-700 font-medium">
                  Email verified
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">
                  Email not verified
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-600" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 pb-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-5">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  className="pr-10 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("currentPassword")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                New Password
              </Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Min 8 chars, uppercase, number, special"
                  className="pr-10 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("newPassword")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  className="pr-10 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("confirmPassword")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-10 rounded-xl font-semibold gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
