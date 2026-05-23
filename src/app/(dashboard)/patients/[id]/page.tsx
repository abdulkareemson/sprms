//src/app/(dashboard)/patients/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
  Heart,
  AlertCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format, differenceInYears } from "date-fns";
import { usePermission } from "@/hooks/usePermission";
import Link from "next/link";

interface PatientProfile {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  nationality: string;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  createdAt: string;
  medicalRecords: Array<{
    id: string;
    recordNumber: string;
    recordType: string;
    title: string;
    createdAt: string;
    createdBy: {
      staffProfile: { firstName: string; lastName: string } | null;
    };
  }>;
  appointments: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    reason: string | null;
    doctor: {
      staffProfile: { firstName: string; lastName: string } | null;
    };
  }>;
  vitalSigns: Array<{
    temperature: number | null;
    systolicBP: number | null;
    diastolicBP: number | null;
    heartRate: number | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
    recordedAt: string;
  }>;
  _count: {
    medicalRecords: number;
    appointments: number;
    prescriptions: number;
    invoices: number;
  };
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value || "—"}</p>
      </div>
    </div>
  );
}

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
  UNKNOWN: "Unknown",
};

const RECORD_TYPE_COLORS: Record<string, string> = {
  CONSULTATION: "bg-blue-100 text-blue-700",
  LAB_RESULT: "bg-purple-100 text-purple-700",
  NURSING_NOTE: "bg-green-100 text-green-700",
  IMAGING: "bg-orange-100 text-orange-700",
  PRESCRIPTION: "bg-red-100 text-red-700",
  DISCHARGE_SUMMARY: "bg-slate-100 text-slate-700",
  REFERRAL: "bg-yellow-100 text-yellow-700",
  VACCINATION: "bg-teal-100 text-teal-700",
};

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission("edit_patient");
  const canViewRecords = hasPermission("create_medical_record");

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await fetch(`/api/patients/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Failed to load patient");
          return;
        }

        setPatient(data.patient);
      } catch {
        setError("Failed to load patient profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-500 font-medium">
          {error ?? "Patient not found"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/patients")}
        >
          Back to Patients
        </Button>
      </div>
    );
  }

  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
  const latestVitals = patient.vitalSigns[0];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/patients")}
          className="text-slate-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Patients
        </Button>
        {canEdit && (
          <Button
            variant="outline"
            onClick={() => router.push(`/patients/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Patient
          </Button>
        )}
      </div>

      {/* ── Patient Header Card ────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold flex-shrink-0">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <p className="text-blue-700 font-mono text-sm font-medium">
                    {patient.patientNumber}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{patient.gender}</Badge>
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    {BLOOD_GROUP_LABELS[patient.bloodGroup] ??
                      patient.bloodGroup}
                  </Badge>
                  <Badge variant="outline">{age} years old</Badge>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {[
                  {
                    label: "Records",
                    value: patient._count.medicalRecords,
                    icon: FileText,
                  },
                  {
                    label: "Appointments",
                    value: patient._count.appointments,
                    icon: Calendar,
                  },
                  {
                    label: "Prescriptions",
                    value: patient._count.prescriptions,
                    icon: Heart,
                  },
                  {
                    label: "Invoices",
                    value: patient._count.invoices,
                    icon: Shield,
                  },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-slate-800">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-600">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={Phone} label="Phone" value={patient.phone} />
              <InfoRow icon={Mail} label="Email" value={patient.email} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={[patient.address, patient.city, patient.state]
                  .filter(Boolean)
                  .join(", ")}
              />
              <InfoRow
                icon={User}
                label="Nationality"
                value={patient.nationality}
              />
              <InfoRow
                icon={Calendar}
                label="Date of Birth"
                value={format(new Date(patient.dateOfBirth), "MMMM d, yyyy")}
              />
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-600">
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={User} label="Name" value={patient.emergencyName} />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={patient.emergencyPhone}
              />
              <InfoRow
                icon={Heart}
                label="Relationship"
                value={patient.emergencyRelation}
              />
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-600">
                Insurance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                icon={Shield}
                label="Provider"
                value={patient.insuranceProvider}
              />
              <InfoRow
                icon={Shield}
                label="Policy Number"
                value={patient.insuranceNumber}
              />
            </CardContent>
          </Card>

          {/* Latest Vitals */}
          {latestVitals && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-600">
                  Latest Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-xs text-slate-400 mb-2">
                  {format(new Date(latestVitals.recordedAt), "MMM d, yyyy")}
                </p>
                {latestVitals.temperature && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Temperature</span>
                    <span className="font-medium">
                      {latestVitals.temperature}°C
                    </span>
                  </div>
                )}
                {latestVitals.systolicBP && latestVitals.diastolicBP && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Blood Pressure</span>
                    <span className="font-medium">
                      {latestVitals.systolicBP}/{latestVitals.diastolicBP} mmHg
                    </span>
                  </div>
                )}
                {latestVitals.heartRate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Heart Rate</span>
                    <span className="font-medium">
                      {latestVitals.heartRate} bpm
                    </span>
                  </div>
                )}
                {latestVitals.bmi && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">BMI</span>
                    <span className="font-medium">
                      {latestVitals.bmi.toFixed(1)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Medical Records */}
          {canViewRecords && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-600">
                  Recent Medical Records
                </CardTitle>
                <Link
                  href={`/patients/${id}/records`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View all →
                </Link>
              </CardHeader>
              <CardContent>
                {patient.medicalRecords.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No medical records yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {patient.medicalRecords.map((record) => (
                      <Link
                        key={record.id}
                        href={`/patients/${id}/records`}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors block"
                      >
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                            RECORD_TYPE_COLORS[record.recordType] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {record.recordType.replace("_", " ")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {record.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {record.recordNumber} •{" "}
                            {format(new Date(record.createdAt), "MMM d, yyyy")}
                          </p>
                          {record.createdBy.staffProfile && (
                            <p className="text-xs text-slate-400">
                              Dr. {record.createdBy.staffProfile.firstName}{" "}
                              {record.createdBy.staffProfile.lastName}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600">
                Recent Appointments
              </CardTitle>
              <Link
                href="/appointments"
                className="text-xs text-blue-600 hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {patient.appointments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No appointments yet
                </p>
              ) : (
                <div className="space-y-3">
                  {patient.appointments.map((apt) => {
                    const statusColors: Record<string, string> = {
                      SCHEDULED: "bg-blue-100 text-blue-700",
                      CONFIRMED: "bg-green-100 text-green-700",
                      IN_PROGRESS: "bg-orange-100 text-orange-700",
                      COMPLETED: "bg-slate-100 text-slate-600",
                      CANCELLED: "bg-red-100 text-red-700",
                      NO_SHOW: "bg-yellow-100 text-yellow-700",
                    };

                    return (
                      <div
                        key={apt.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-4 w-4 text-blue-700" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            {apt.reason ?? "Appointment"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(
                              new Date(apt.scheduledAt),
                              "MMM d, yyyy — h:mm a",
                            )}
                          </p>
                          {apt.doctor.staffProfile && (
                            <p className="text-xs text-slate-400">
                              Dr. {apt.doctor.staffProfile.firstName}{" "}
                              {apt.doctor.staffProfile.lastName}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                            statusColors[apt.status] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {apt.status.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />
          <p className="text-xs text-slate-400 text-right">
            Patient registered on{" "}
            {format(new Date(patient.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
      </div>
    </div>
  );
}
