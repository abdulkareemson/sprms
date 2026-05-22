"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Weight,
  Ruler,
  Calculator,
  Loader2,
  Save,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createVitalSignSchema } from "@/schemas/record.schema";
import { toast } from "sonner";
import { z } from "zod";

type VitalFormValues = z.input<typeof createVitalSignSchema>;

interface VitalSignsFormProps {
  patientId: string;
  recordId?: string;
  onSuccess?: () => void;
}

// ─── Vital card wrapper with icon and range ───────────────────────────────────

function VitalField({
  icon: Icon,
  label,
  unit,
  normalRange,
  color,
  children,
}: {
  icon: React.ElementType;
  label: string;
  unit: string;
  normalRange: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <div
        className={`rounded-xl border border-slate-100 bg-white p-4
          hover:shadow-md hover:border-slate-200
          transition-all duration-200`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">{label}</p>
            <p className="text-[10px] text-slate-400">
              Normal: {normalRange} {unit}
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function VitalSignsForm({
  patientId,
  recordId,
  onSuccess,
}: VitalSignsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VitalFormValues>({
    resolver: zodResolver(createVitalSignSchema),
    defaultValues: {
      patientId,
      recordId: recordId ?? undefined,
    },
  });

  // Watch weight and height for BMI calc
  const weight = watch("weight");
  const height = watch("height");

  const calculateBMI = () => {
    if (weight && height) {
      const h = Number(height) / 100;
      const bmi = Math.round((Number(weight) / (h * h)) * 10) / 10;
      setCalculatedBMI(bmi);
    }
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" };
    if (bmi < 25) return { label: "Normal", color: "text-green-600" };
    if (bmi < 30) return { label: "Overweight", color: "text-orange-600" };
    return { label: "Obese", color: "text-red-600" };
  };

  const onSubmit = async (data: VitalFormValues) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Vital signs recorded successfully");
        onSuccess?.();
      } else {
        toast.error(result.error ?? "Failed to record vitals");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          Record Vital Signs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("patientId")} />
          {recordId && <input type="hidden" {...register("recordId")} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Temperature */}
            <VitalField
              icon={Thermometer}
              label="Temperature"
              unit="°C"
              normalRange="36.1–37.2"
              color="bg-orange-50 text-orange-600"
            >
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  className="pr-8 text-lg font-semibold h-12"
                  {...register("temperature")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  °C
                </span>
              </div>
              {errors.temperature && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.temperature.message}
                </p>
              )}
            </VitalField>

            {/* Blood Pressure */}
            <VitalField
              icon={Droplets}
              label="Blood Pressure"
              unit="mmHg"
              normalRange="90/60–120/80"
              color="bg-red-50 text-red-600"
            >
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="120"
                  className="text-lg font-semibold h-12 text-center"
                  {...register("systolicBP")}
                />
                <span className="text-slate-400 font-bold text-lg">/</span>
                <Input
                  type="number"
                  placeholder="80"
                  className="text-lg font-semibold h-12 text-center"
                  {...register("diastolicBP")}
                />
              </div>
            </VitalField>

            {/* Heart Rate */}
            <VitalField
              icon={Heart}
              label="Heart Rate"
              unit="bpm"
              normalRange="60–100"
              color="bg-pink-50 text-pink-600"
            >
              <div className="relative">
                <Input
                  type="number"
                  placeholder="72"
                  className="pr-12 text-lg font-semibold h-12"
                  {...register("heartRate")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  bpm
                </span>
              </div>
            </VitalField>

            {/* Respiratory Rate */}
            <VitalField
              icon={Wind}
              label="Respiratory Rate"
              unit="br/min"
              normalRange="12–20"
              color="bg-sky-50 text-sky-600"
            >
              <div className="relative">
                <Input
                  type="number"
                  placeholder="16"
                  className="pr-16 text-lg font-semibold h-12"
                  {...register("respiratoryRate")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  br/min
                </span>
              </div>
            </VitalField>

            {/* SpO2 */}
            <VitalField
              icon={Droplets}
              label="Oxygen Saturation"
              unit="%"
              normalRange="95–100"
              color="bg-indigo-50 text-indigo-600"
            >
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="98"
                  className="pr-8 text-lg font-semibold h-12"
                  {...register("oxygenSaturation")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  %
                </span>
              </div>
            </VitalField>

            {/* Weight */}
            <VitalField
              icon={Weight}
              label="Weight"
              unit="kg"
              normalRange="—"
              color="bg-green-50 text-green-600"
            >
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  className="pr-8 text-lg font-semibold h-12"
                  {...register("weight")}
                  onBlur={calculateBMI}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  kg
                </span>
              </div>
            </VitalField>

            {/* Height */}
            <VitalField
              icon={Ruler}
              label="Height"
              unit="cm"
              normalRange="—"
              color="bg-violet-50 text-violet-600"
            >
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="170"
                  className="pr-8 text-lg font-semibold h-12"
                  {...register("height")}
                  onBlur={calculateBMI}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  cm
                </span>
              </div>
            </VitalField>

            {/* BMI Calculator */}
            <VitalField
              icon={Calculator}
              label="BMI"
              unit="kg/m²"
              normalRange="18.5–24.9"
              color="bg-amber-50 text-amber-600"
            >
              <div className="h-12 rounded-lg bg-slate-50 flex items-center justify-center">
                {calculatedBMI ? (
                  <div className="text-center">
                    <span className="text-2xl font-bold text-slate-800">
                      {calculatedBMI}
                    </span>
                    <span
                      className={`block text-[10px] font-semibold ${getBMICategory(calculatedBMI).color}`}
                    >
                      {getBMICategory(calculatedBMI).label}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    Enter weight & height
                  </span>
                )}
              </div>
            </VitalField>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Notes (optional)</Label>
            <Textarea
              placeholder="Additional observations..."
              rows={2}
              className="resize-none"
              {...register("notes")}
            />
          </div>

          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Vital Signs
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
