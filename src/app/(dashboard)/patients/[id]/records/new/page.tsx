//src/app/(dashboard)/patients/[id]/records/new/page.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { createRecordSchema } from "@/schemas/record.schema";
import { RECORD_TYPE_CONFIG } from "@/lib/record-utils";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";
import { z } from "zod";

type RecordFormValues = z.input<typeof createRecordSchema>;

export default function NewRecordPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canCreateFullRecord = hasPermission("create_medical_record");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter record types based on permission
  const allowedTypes = canCreateFullRecord
    ? Object.keys(RECORD_TYPE_CONFIG)
    : ["NURSING_NOTE", "VACCINATION"];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(createRecordSchema),
    defaultValues: {
      patientId,
      isConfidential: false,
    },
  });

  const selectedType = watch("recordType");

  const onSubmit = async (data: RecordFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Record created: ${result.record.recordNumber}`);
        router.push(`/patients/${patientId}/records`);
      } else {
        setError(result.error ?? "Failed to create record");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Create Medical Record"
        description="Enter clinical details for this visit"
        action={
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-slate-500"
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
        <input type="hidden" {...register("patientId")} />

        {/* Record Type Selection */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Record Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allowedTypes.map((type) => {
                const config = RECORD_TYPE_CONFIG[type];
                if (!config) return null;
                const Icon = config.icon;
                const isSelected = selectedType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setValue(
                        "recordType",
                        type as RecordFormValues["recordType"],
                      )
                    }
                    className={`rounded-xl p-3 text-center border-2 transition-all duration-200
                      ${
                        isSelected
                          ? `${config.bgColor} ${config.borderColor.replace("border-l-", "border-")} shadow-md scale-[1.02]`
                          : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 mx-auto mb-1.5 ${isSelected ? config.color : "text-slate-400"}`}
                    />
                    <p
                      className={`text-xs font-semibold ${isSelected ? config.color : "text-slate-500"}`}
                    >
                      {config.label}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.recordType && (
              <p className="text-xs text-red-500 mt-2">
                {errors.recordType.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Title & ICD */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">
                Record Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Follow-up consultation for hypertension"
                className="h-12 text-base"
                {...register("title")}
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="icdCode">ICD-10 Code (optional)</Label>
              <Input
                id="icdCode"
                placeholder="e.g. I10, J06.9, E11.9"
                className="font-mono"
                {...register("icdCode")}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Clinical Details */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Clinical Details</CardTitle>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Sensitive fields are encrypted before storage (AES-256)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                placeholder="Enter primary and secondary diagnoses..."
                rows={3}
                className="resize-none"
                {...register("diagnosis")}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="treatment">Treatment Plan</Label>
              <Textarea
                id="treatment"
                placeholder="Describe the treatment plan, procedures, medications..."
                rows={4}
                className="resize-none"
                {...register("treatment")}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional observations, history, or clinical notes..."
                rows={4}
                className="resize-none"
                {...register("notes")}
                disabled={isLoading}
              />
            </div>

            <Separator />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isConfidential"
                onCheckedChange={(checked) =>
                  setValue("isConfidential", checked === true)
                }
              />
              <Label
                htmlFor="isConfidential"
                className="text-sm text-slate-600 cursor-pointer"
              >
                Mark as confidential (restricted visibility)
              </Label>
            </div>
          </CardContent>
        </Card>

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
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
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
                Create Record
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
