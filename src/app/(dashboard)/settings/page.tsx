//src/app/(dashboard)/settings/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Loader2, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/schemas/auth.schema";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Settings" description="Manage your account settings" />

      {mustChange && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-700">
            ⚠️ You are required to change your password before using the system.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-slate-500 text-xs">Name</Label>
            <p className="text-slate-800 font-medium">
              {session?.user?.name ?? "—"}
            </p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Email</Label>
            <p className="text-slate-800">{session?.user?.email ?? "—"}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Role</Label>
            <p className="text-slate-800">
              {session?.user?.role?.replace("_", " ") ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register("currentPassword")}
                disabled={isLoading}
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-500">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 8 chars, uppercase, number, special"
                {...register("newPassword")}
                disabled={isLoading}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
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
