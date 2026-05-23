// src/app/(dashboard)/appointments/new/page.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultPatientId = searchParams.get("patientId") ?? undefined;
  const defaultDoctorId = searchParams.get("doctorId") ?? undefined;

  return (
    <RoleGuard permission="manage_appointments">
      <div className="flex flex-col min-h-full">
        <PageHeader
          title="Book Appointment"
          description="Schedule a new appointment for a patient"
          backHref="/appointments"
        />

        <div className="flex-1 px-4 sm:px-6 pb-6 max-w-2xl">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm shadow-blue-200">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Appointment Details
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <AppointmentForm
                defaultPatientId={defaultPatientId}
                defaultDoctorId={defaultDoctorId}
                onSuccess={() => router.push("/appointments")}
                onCancel={() => router.back()}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
