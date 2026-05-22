//src/app/(auth)/register/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  registerPatientSchema,
  type RegisterPatientInput,
} from "@/schemas/auth.schema";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterPatientInput>({
    resolver: zodResolver(registerPatientSchema),
  });

  const onSubmit = async (data: RegisterPatientInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(
          `Account created! Your Patient Number is ${result.patientNumber}. 
           Please check your email to verify your account.`,
        );
      } else {
        setError(result.error ?? "Registration failed. Please try again.");
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
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Registration Successful!
        </h2>
        <p className="text-slate-500 text-sm mb-6">{success}</p>
        <Link href="/login">
          <Button className="w-full bg-blue-700 hover:bg-blue-800">
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        Patient Registration
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Create your patient portal account
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="Aisha"
              {...register("firstName")}
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Bello"
              {...register("lastName")}
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="08012345678"
            {...register("phone")}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register("dateOfBirth")}
              disabled={isLoading}
            />
            {errors.dateOfBirth && (
              <p className="text-xs text-red-500">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select
              onValueChange={(value) =>
                setValue("gender", value as "MALE" | "FEMALE" | "OTHER")
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-xs text-red-500">{errors.gender.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 chars, uppercase, number, special"
              className="pr-9"
              {...register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat password"
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
          className="w-full bg-blue-700 hover:bg-blue-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Already have an account? Sign in
        </Link>
      </div>
    </>
  );
}
