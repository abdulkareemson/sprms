"use client";

import { useState } from "react";
import { FileText, Filter } from "lucide-react";
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
import { useRecords, type MedicalRecord } from "@/hooks/useRecords";
import { RECORD_TYPE_CONFIG } from "@/lib/record-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FullMedicalRecord } from "@/types/records";

export default function MyRecordsPage() {
  const { records, recordType, setRecordType, isLoading } = useRecords();
  const [detailRecord, setDetailRecord] = useState<FullMedicalRecord | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRecordClick = async (record: MedicalRecord) => {
    setDetailLoading(true);
    setDetailOpen(true);

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
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="My Medical Records"
        description="View your complete health history"
      />

      {/* Filter */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
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

      {/* Timeline */}
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
          icon={FileText}
          title="No medical records yet"
          description="Your medical records will appear here after your visits"
        />
      ) : (
        <RecordTimeline records={records} onRecordClick={handleRecordClick} />
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          ) : detailRecord ? (
            <RecordDetail record={detailRecord} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
