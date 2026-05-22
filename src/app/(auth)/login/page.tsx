//src/app/(auth)/login/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginSchema, type LoginInput } from "@/schemas/auth.schema";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        const errorMap: Record<string, string> = {
          ACCOUNT_LOCKED:
            "Your account has been temporarily locked due to multiple failed login attempts. Please try again in 30 minutes.",
          ACCOUNT_DISABLED:
            "Your account has been disabled. Please contact the administrator.",
          INVALID_CREDENTIALS:
            "Invalid email or password. Please check your credentials.",
        };
        setError(
          errorMap[result.error] ??
            "Invalid email or password. Please try again.",
        );
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Welcome back
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Sign in to your SPRMS account
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-9"
              {...register("email")}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-9 pr-9"
              {...register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-blue-700 hover:bg-blue-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Are you a patient?{" "}
          <Link
            href="/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
