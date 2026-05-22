"use client";

import { format } from "date-fns";
import {
  Lock,
  Clock,
  User,
  Hash,
  Pill,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRecordConfig } from "@/lib/record-utils";
import type { FullMedicalRecord } from "@/types/records";

interface RecordDetailProps {
  record: FullMedicalRecord;
}

// ─── Section component with accent ────────────────────────────────────────────

function Section({
  title,
  content,
  accentColor = "blue",
}: {
  title: string;
  content: string | null;
  accentColor?: string;
}) {
  if (!content) return null;

  const accents: Record<string, string> = {
    blue: "from-blue-500",
    purple: "from-purple-500",
    green: "from-green-500",
    amber: "from-amber-500",
  };

  return (
    <div className="relative">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b ${accents[accentColor]} to-transparent`}
      />
      <div className="pl-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {title}
        </p>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}

export function RecordDetail({ record }: RecordDetailProps) {
  const config = getRecordConfig(record.recordType);
  const Icon = config.icon;
  const vitals = record.vitalSigns?.[0];

  return (
    <div className="space-y-6">
      {/* ── Header Card ───────────────────────────────────────────── */}
      <div className={`rounded-2xl ${config.bgColor} p-6 border border-slate-100`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <Icon className={`h-7 w-7 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
              {record.isConfidential && (
                <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  Confidential
                </Badge>
              )}
              {record.icdCode && (
                <Badge variant="outline" className="text-[10px] font-mono border-slate-200">
                  ICD: {record.icdCode}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-1">
              {record.title}
            </h1>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {record.recordNumber}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(record.createdAt), "MMM d, yyyy — h:mm a")}
              </span>
              {record.createdBy?.staffProfile && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Dr. {record.createdBy.staffProfile.firstName}{" "}
                  {record.createdBy.staffProfile.lastName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Clinical Content ──────────────────────────────────────── */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 space-y-6">
          <Section title="Diagnosis" content={record.diagnosis} accentColor="blue" />
          <Section title="Treatment Plan" content={record.treatment} accentColor="green" />
          <Section title="Clinical Notes" content={record.notes} accentColor="purple" />
          {!record.diagnosis && !record.treatment && !record.notes && (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No clinical details recorded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Vital Signs ───────────────────────────────────────────── */}
      {vitals && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Vital Signs</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Temperature",
                  value: vitals.temperature,
                  unit: "°C",
                  color: "bg-orange-50 text-orange-700",
                },
                {
                  label: "Blood Pressure",
                  value:
                    vitals.systolicBP && vitals.diastolicBP
                      ? `${vitals.systolicBP}/${vitals.diastolicBP}`
                      : null,
                  unit: "mmHg",
                  color: "bg-red-50 text-red-700",
                },
                {
                  label: "Heart Rate",
                  value: vitals.heartRate,
                  unit: "bpm",
                  color: "bg-pink-50 text-pink-700",
                },
                {
                  label: "SpO₂",
                  value: vitals.oxygenSaturation,
                  unit: "%",
                  color: "bg-indigo-50 text-indigo-700",
                },
                {
                  label: "Resp. Rate",
                  value: vitals.respiratoryRate,
                  unit: "br/min",
                  color: "bg-sky-50 text-sky-700",
                },
                {
                  label: "Weight",
                  value: vitals.weight,
                  unit: "kg",
                  color: "bg-green-50 text-green-700",
                },
                {
                  label: "Height",
                  value: vitals.height,
                  unit: "cm",
                  color: "bg-violet-50 text-violet-700",
                },
                {
                  label: "BMI",
                  value: vitals.bmi ? vitals.bmi.toFixed(1) : null,
                  unit: "kg/m²",
                  color: "bg-amber-50 text-amber-700",
                },
              ]
                .filter((v) => v.value !== null)
                .map((v) => (
                  <div key={v.label} className={`rounded-xl p-3 text-center ${v.color}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                      {v.label}
                    </p>
                    <p className="text-xl font-bold mt-0.5">{v.value}</p>
                    <p className="text-[10px] opacity-60">{v.unit}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Prescriptions ─────────────────────────────────────────── */}
      {record.prescriptions.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Pill className="h-4 w-4 text-rose-500" />
              Prescriptions ({record.prescriptions.length})
            </h3>
            <div className="space-y-3">
              {record.prescriptions.map((rx) => {
                const statusColors: Record<string, string> = {
                  PENDING: "bg-amber-100 text-amber-700",
                  DISPENSED: "bg-green-100 text-green-700",
                  PARTIALLY_DISPENSED: "bg-blue-100 text-blue-700",
                };
                return (
                  <div
                    key={rx.id}
                    className="rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {rx.medicationName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rx.dosage} • {rx.frequency} • {rx.duration} • {rx.route}
                        </p>
                        {rx.instructions && (
                          <p className="text-xs text-slate-400 mt-1 italic">
                            &ldquo;{rx.instructions}&rdquo;
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          statusColors[rx.dispenseStatus] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rx.dispenseStatus.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}