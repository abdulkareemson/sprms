//src/app/(auth)/forgot-password/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/schemas/auth.schema";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const result = await response.json();
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Check your email
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          If an account with that email exists, we have sent a password reset
          link. Please check your inbox and spam folder.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Forgot password?
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Enter your email and we will send you a reset link.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <Button
          type="submit"
          className="w-full bg-blue-700 hover:bg-blue-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Login
        </Link>
      </div>
    </>
  );
}
