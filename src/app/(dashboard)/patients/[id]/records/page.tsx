"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Filter, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RecordTimeline } from "@/components/records/RecordTimeline";
import { RecordDetail } from "@/components/records/RecordDetail";
import { VitalSignsForm } from "@/components/records/VitalSignsForm";
import { useRecords, type MedicalRecord } from "@/hooks/useRecords";
import { usePermission } from "@/hooks/usePermission";
import { RECORD_TYPE_CONFIG } from "@/lib/record-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FullMedicalRecord } from "@/types/records";

export default function PatientRecordsPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const canCreateRecord = usePermission("create_medical_record");
  const canCreateNote = usePermission("create_nursing_note");
  const canRecordVitals = usePermission("record_vitals");

  const { records, recordType, setRecordType, isLoading, refetch } =
    useRecords(patientId);

  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [detailRecord, setDetailRecord] = useState<FullMedicalRecord | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRecordClick = async (record: MedicalRecord) => {
    setSelectedRecord(record.id);
    setDetailLoading(true);

    try {
      const response = await fetch(`/api/records/${record.id}`);
      const data = await response.json();
      if (response.ok) {
        setDetailRecord(data.record as FullMedicalRecord);
      }
    } catch {
      // fail silently
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Medical Records"
        description="Complete medical history timeline"
        action={
          <div className="flex items-center gap-2">
            {canRecordVitals && (
              <Button
                variant="outline"
                onClick={() => setShowVitalsForm(true)}
                className="border-pink-200 text-pink-700 hover:bg-pink-50"
              >
                <Activity className="mr-2 h-4 w-4" />
                Record Vitals
              </Button>
            )}
            {(canCreateRecord || canCreateNote) && (
              <Button
                onClick={() =>
                  router.push(`/patients/${patientId}/records/new`)
                }
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Record
              </Button>
            )}
          </div>
        }
      />

      <Button
        variant="ghost"
        onClick={() => router.push(`/patients/${patientId}`)}
        className="text-slate-500 mb-4 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Patient Profile
      </Button>

      {/* Filter Bar */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
            <Select
              value={recordType || "all"}
              onValueChange={(v) => setRecordType(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="All record types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Record Types</SelectItem>
                {Object.entries(RECORD_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${config.dotColor}`}
                      />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-400 ml-auto">
              {records.length} record(s)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <Skeleton className="h-24 flex-1 rounded-xl" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <EmptyState
              title="No medical records yet"
              description="Medical records will appear here as they are created"
            />
          ) : (
            <RecordTimeline
              records={records}
              onRecordClick={handleRecordClick}
            />
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedRecord ? (
            detailLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-60 rounded-xl" />
              </div>
            ) : detailRecord ? (
              <div className="sticky top-20">
                <RecordDetail record={detailRecord} />
              </div>
            ) : null
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-4 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">
                  Click on a record to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Vitals Modal */}
      <Dialog open={showVitalsForm} onOpenChange={setShowVitalsForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
          </DialogHeader>
          <VitalSignsForm
            patientId={patientId}
            onSuccess={() => {
              setShowVitalsForm(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
