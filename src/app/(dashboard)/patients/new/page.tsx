//src/app/(dashboard)/patients/new/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { createPatientSchema } from "@/schemas/patient.schema";
import { z } from "zod";
import { toast } from "sonner";

// ── Derive a form-safe type where bloodGroup is always defined ────────────────
type PatientFormValues = z.input<typeof createPatientSchema>;

const BLOOD_GROUPS = [
  { value: "A_POSITIVE", label: "A+" },
  { value: "A_NEGATIVE", label: "A-" },
  { value: "B_POSITIVE", label: "B+" },
  { value: "B_NEGATIVE", label: "B-" },
  { value: "AB_POSITIVE", label: "AB+" },
  { value: "AB_NEGATIVE", label: "AB-" },
  { value: "O_POSITIVE", label: "O+" },
  { value: "O_NEGATIVE", label: "O-" },
  { value: "UNKNOWN", label: "Unknown" },
];

const NIGERIA_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export default function NewPatientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      nationality: "Nigerian",
      bloodGroup: "UNKNOWN",
    },
  });

  const onSubmit = async (data: PatientFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Patient registered successfully! Number: ${result.patient.patientNumber}`,
        );
        router.push(`/patients/${result.patient.id}`);
      } else {
        setError(result.error ?? "Failed to register patient");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Register New Patient"
        description="Fill in the patient details below"
        action={
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Personal Information ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="Aisha"
                  {...register("firstName")}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="Bello"
                  {...register("lastName")}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
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
                <Label>
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(v) =>
                    setValue("gender", v as PatientFormValues["gender"])
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-xs text-red-500">
                    {errors.gender.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Blood Group</Label>
                <Select
                  defaultValue="UNKNOWN"
                  onValueChange={(v) =>
                    setValue("bloodGroup", v as PatientFormValues["bloodGroup"])
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg.value} value={bg.value}>
                        {bg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="08012345678"
                  {...register("phone")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="patient@example.com"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Address ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="address">Street Address</Label>
              <Textarea
                id="address"
                placeholder="12 Ahmadu Bello Way"
                rows={2}
                {...register("address")}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Zaria"
                  {...register("city")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Select
                  onValueChange={(v) => setValue("state", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {NIGERIA_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  placeholder="Nigerian"
                  {...register("nationality")}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Emergency Contact ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="emergencyName">Full Name</Label>
                <Input
                  id="emergencyName"
                  placeholder="Contact name"
                  {...register("emergencyName")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input
                  id="emergencyPhone"
                  placeholder="08012345678"
                  {...register("emergencyPhone")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergencyRelation">Relationship</Label>
                <Input
                  id="emergencyRelation"
                  placeholder="Spouse / Parent / Sibling"
                  {...register("emergencyRelation")}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Insurance ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Insurance Information{" "}
              <span className="text-slate-400 font-normal text-sm">
                (optional)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  placeholder="e.g. NHIS, Hygeia"
                  {...register("insuranceProvider")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="insuranceNumber">Insurance Number</Label>
                <Input
                  id="insuranceNumber"
                  placeholder="Policy number"
                  {...register("insuranceNumber")}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-700 hover:bg-blue-800"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Register Patient
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
