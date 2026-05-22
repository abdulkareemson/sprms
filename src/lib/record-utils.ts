//src/lib/record-utils.ts

import {
  Stethoscope,
  FlaskConical,
  ClipboardPlus,
  ScanLine,
  Pill,
  DoorOpen,
  ArrowRightLeft,
  Syringe,
  type LucideIcon,
} from "lucide-react";

export interface RecordTypeConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

export const RECORD_TYPE_CONFIG: Record<string, RecordTypeConfig> = {
  CONSULTATION: {
    label: "Consultation",
    icon: Stethoscope,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-l-blue-500",
    dotColor: "bg-blue-500",
  },
  LAB_RESULT: {
    label: "Lab Result",
    icon: FlaskConical,
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-l-purple-500",
    dotColor: "bg-purple-500",
  },
  NURSING_NOTE: {
    label: "Nursing Note",
    icon: ClipboardPlus,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-l-emerald-500",
    dotColor: "bg-emerald-500",
  },
  IMAGING: {
    label: "Imaging",
    icon: ScanLine,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-l-amber-500",
    dotColor: "bg-amber-500",
  },
  PRESCRIPTION: {
    label: "Prescription",
    icon: Pill,
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-l-rose-500",
    dotColor: "bg-rose-500",
  },
  DISCHARGE_SUMMARY: {
    label: "Discharge Summary",
    icon: DoorOpen,
    color: "text-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-l-slate-500",
    dotColor: "bg-slate-500",
  },
  REFERRAL: {
    label: "Referral",
    icon: ArrowRightLeft,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-l-orange-500",
    dotColor: "bg-orange-500",
  },
  VACCINATION: {
    label: "Vaccination",
    icon: Syringe,
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-l-teal-500",
    dotColor: "bg-teal-500",
  },
};

export function getRecordConfig(type: string): RecordTypeConfig {
  return (
    RECORD_TYPE_CONFIG[type] ?? {
      label: type,
      icon: Stethoscope,
      color: "text-slate-700",
      bgColor: "bg-slate-50",
      borderColor: "border-l-slate-400",
      dotColor: "bg-slate-400",
    }
  );
}
