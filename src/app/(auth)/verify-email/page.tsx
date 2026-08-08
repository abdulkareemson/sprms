// src/app/(auth)/verify-email/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── States ───────────────────────────────────────────────────────────────────

type VerifyState = "loading" | "success" | "error" | "no-token";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(
    token ? "loading" : "no-token",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState(5);

  const verifyToken = useCallback(async (tok: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok }),
      });

      const result = await response.json();

      if (response.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorMessage(
          result.error ?? "Verification failed. Please try again.",
        );
      }
    } catch {
      setState("error");
      setErrorMessage("Network error. Please check your connection.");
    }
  }, []);

  // Auto-verify when token is present in URL
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  // Auto-redirect countdown after success
  useEffect(() => {
    if (state !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, router]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Verifying your email...
        </h2>
        <p className="text-sm text-slate-500">
          Please wait while we confirm your email address.
        </p>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Email Verified! ✓
        </h2>
        <p className="text-sm text-slate-500 mb-1">
          Your email has been successfully verified.
        </p>
        <p className="text-sm text-slate-400 mb-6">
          You can now log in to access your patient portal.
        </p>

        {/* Auto-redirect notice */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-5">
          <p className="text-xs text-emerald-700">
            Redirecting to login in{" "}
            <span className="font-bold text-emerald-800">{countdown}s</span>
            ...
          </p>
        </div>

        <Link href="/login">
          <Button className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold gap-2">
            Go to Login Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Verification Failed
        </h2>
        <p className="text-sm text-red-600 mb-1 font-medium">{errorMessage}</p>
        <p className="text-xs text-slate-400 mb-6">
          The link may have expired or already been used.
        </p>

        <div className="space-y-3">
          {/* Retry with same token */}
          {token && (
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl gap-2"
              onClick={() => {
                setState("loading");
                verifyToken(token);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}

          <Link href="/login">
            <Button className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold gap-2">
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── No token state (accessed /verify-email directly) ───────────────────────
  return (
    <div className="text-center py-4">
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail className="h-8 w-8 text-blue-500" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        Check Your Email
      </h2>
      <p className="text-sm text-slate-500 mb-2">
        We sent a verification link to your email address.
      </p>
      <p className="text-xs text-slate-400 mb-6">
        Click the link in the email to verify your account.
        <br />
        The link expires in{" "}
        <span className="font-semibold text-slate-600">24 hours</span>.
      </p>

      {/* Tips */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5 text-left">
        <p className="text-xs font-semibold text-slate-600 mb-2">
          Didn&apos;t receive the email?
        </p>
        <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email</li>
          <li>Wait a few minutes and check again</li>
        </ul>
      </div>

      <Link href="/login">
        <Button
          variant="outline"
          className="w-full h-10 rounded-xl gap-2 border-slate-200"
        >
          <ArrowRight className="h-4 w-4" />
          Back to Login
        </Button>
      </Link>
    </div>
  );
}
