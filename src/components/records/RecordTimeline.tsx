"use client";

import { format, isToday, isYesterday } from "date-fns";
import { Lock, FileText, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRecordConfig } from "@/lib/record-utils";
import type { MedicalRecord } from "@/hooks/useRecords";

interface RecordTimelineProps {
  records: MedicalRecord[];
  onRecordClick: (record: MedicalRecord) => void;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

function groupByDate(records: MedicalRecord[]): Map<string, MedicalRecord[]> {
  const groups = new Map<string, MedicalRecord[]>();

  records.forEach((record) => {
    const dateKey = format(new Date(record.createdAt), "yyyy-MM-dd");
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(record);
  });

  return groups;
}

export function RecordTimeline({
  records,
  onRecordClick,
}: RecordTimelineProps) {
  const grouped = groupByDate(records);

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([dateKey, dayRecords]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
              {formatDateLabel(dayRecords[0].createdAt)}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
          </div>

          {/* Records for this date */}
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

            {dayRecords.map((record) => {
              const config = getRecordConfig(record.recordType);
              const Icon = config.icon;

              return (
                <div
                  key={record.id}
                  onClick={() => onRecordClick(record)}
                  className="relative flex gap-4 py-2 cursor-pointer group"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center
                        ring-4 ring-white shadow-sm group-hover:shadow-md
                        transition-all duration-200 group-hover:scale-110`}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 bg-white rounded-xl border border-slate-100 p-4
                      hover:border-slate-200 hover:shadow-md
                      transition-all duration-200 border-l-4 ${config.borderColor}
                      group-hover:translate-x-1`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Type badge + confidential */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${config.color}`}
                          >
                            {config.label}
                          </span>
                          {record.isConfidential && (
                            <Lock className="h-3 w-3 text-red-400" />
                          )}
                          {record._count.prescriptions > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 gap-0.5 border-rose-200 text-rose-600"
                            >
                              <Pill className="h-2.5 w-2.5" />
                              {record._count.prescriptions}
                            </Badge>
                          )}
                          {record._count.documents > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 gap-0.5 border-slate-200 text-slate-500"
                            >
                              <FileText className="h-2.5 w-2.5" />
                              {record._count.documents}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-slate-800 leading-snug">
                          {record.title}
                        </h3>

                        {/* Diagnosis preview */}
                        {record.diagnosis && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            <span className="font-medium text-slate-600">
                              Dx:
                            </span>{" "}
                            {record.diagnosis}
                          </p>
                        )}

                        {/* Notes preview */}
                        {!record.diagnosis && record.notes && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {record.notes}
                          </p>
                        )}
                      </div>

                      {/* Right side — time + record number */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-slate-500">
                          {format(new Date(record.createdAt), "h:mm a")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {record.recordNumber}
                        </p>
                      </div>
                    </div>

                    {/* Footer — vitals indicator + author */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-50">
                      {/* Quick vitals preview */}
                      {record.vitalSigns?.[0] && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {record.vitalSigns[0].systolicBP && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              {record.vitalSigns[0].systolicBP}/
                              {record.vitalSigns[0].diastolicBP}
                            </span>
                          )}
                          {record.vitalSigns[0].heartRate && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                              {record.vitalSigns[0].heartRate} bpm
                            </span>
                          )}
                          {record.vitalSigns[0].temperature && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                              {record.vitalSigns[0].temperature}°C
                            </span>
                          )}
                        </div>
                      )}

                      {/* Author */}
                      {record.createdBy?.staffProfile && (
                        <p className="text-[11px] text-slate-400 ml-auto">
                          Dr. {record.createdBy.staffProfile.firstName}{" "}
                          {record.createdBy.staffProfile.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
