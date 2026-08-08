// src/components/reports/AuditLogPDF.tsx

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  PDF_HOSPITAL_NAME,
  PDF_HOSPITAL_ADDRESS,
  PDF_APP_NAME,
  loadLogoBase64,
  drawLogo,
  textStartX,
} from "@/lib/pdfUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id          : string;
  action      : string;
  resource    : string;
  description : string;
  ipAddress?  : string | null;
  createdAt   : string;
  user?       : {
    email         : string;
    role          : string;
    staffProfile? : { firstName: string; lastName: string } | null;
    patient?      : { firstName: string; lastName: string } | null;
  } | null;
}

interface AuditLogPDFParams {
  logs        : AuditLogEntry[];
  fromDate?   : string;
  toDate?     : string;
  generatedBy : string;
  total       : number;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  primary  : [37, 99, 235]   as [number, number, number],
  dark     : [15, 23, 42]    as [number, number, number],
  mid      : [71, 85, 105]   as [number, number, number],
  light    : [148, 163, 184] as [number, number, number],
  muted    : [226, 232, 240] as [number, number, number],
  bg       : [248, 250, 252] as [number, number, number],
  white    : [255, 255, 255] as [number, number, number],
  adminRed : [220, 38, 38]   as [number, number, number],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getUserName(log: AuditLogEntry): string {
  if (!log.user) return "System";
  if (log.user.staffProfile) {
    return `${log.user.staffProfile.firstName} ${log.user.staffProfile.lastName}`;
  }
  if (log.user.patient) {
    return `${log.user.patient.firstName} ${log.user.patient.lastName}`;
  }
  return log.user.email;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateAuditLogPDF(params: AuditLogPDFParams) {
  // Load logo first
  const logoB64 = await loadLogoBase64();

  const doc = new jsPDF({
    orientation : "landscape",
    unit        : "mm",
    format      : "a4",
  });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Header banner ─────────────────────────────────────────────────────
  doc.setFillColor(...C.adminRed);
  doc.rect(0, 0, W, 42, "F");

  // Lighter red accent triangle
  doc.setFillColor(239, 68, 68);
  doc.triangle(W - 50, 0, W, 0, W, 42, "F");

  // Draw logo on top of banner
  drawLogo(doc, logoB64);

  // Text start X — shifts right when logo present
  const tX = textStartX(!!logoB64);

  // Hospital name (Line 1)
  doc.setTextColor(...C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(PDF_HOSPITAL_NAME, tX, 14);

  // Hospital address (Line 2)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(254, 202, 202); // red-200
  doc.text(PDF_HOSPITAL_ADDRESS, tX, 21);

  // App name (Line 3)
  doc.setFontSize(7);
  doc.setTextColor(254, 202, 202);
  doc.text(PDF_APP_NAME, tX, 27);

  // Title on right
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("AUDIT LOG EXPORT", W - 14, 15, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(254, 202, 202);
  doc.text("ADMIN RESTRICTED — CONFIDENTIAL", W - 14, 23, {
    align: "right",
  });

  // ── Sub-header ────────────────────────────────────────────────────────
  let y = 48;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.mid);

  const dateRange =
    params.fromDate && params.toDate
      ? `Period: ${format(
          new Date(params.fromDate),
          "MMM d, yyyy",
        )} – ${format(new Date(params.toDate), "MMM d, yyyy")}`
      : "Period: All time";

  doc.text(dateRange, 14, y);
  doc.text(
    `Total entries (this export): ${params.logs.length} of ${params.total}`,
    W - 14,
    y,
    { align: "right" },
  );

  y += 8;

  // ── Table ─────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY : y,
    margin : { left: 14, right: 14 },
    head   : [
      [
        "Timestamp",
        "Action",
        "User",
        "Role",
        "Resource",
        "Description",
        "IP Address",
      ],
    ],
    body: params.logs.map((log) => [
      format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss"),
      log.action.replace(/_/g, " "),
      getUserName(log),
      log.user?.role ?? "—",
      log.resource,
      log.description.length > 60
        ? log.description.slice(0, 60) + "..."
        : log.description,
      log.ipAddress ?? "—",
    ]),
    headStyles: {
      fillColor : C.adminRed,
      textColor : C.white,
      fontSize  : 8,
      fontStyle : "bold",
    },
    bodyStyles         : { fontSize: 7.5, textColor: C.dark },
    alternateRowStyles : { fillColor: C.bg },
    tableLineColor     : C.muted,
    tableLineWidth     : 0.15,
    columnStyles       : {
      0 : { cellWidth: 38 },
      1 : { cellWidth: 26 },
      5 : { cellWidth: 70 },
      6 : { cellWidth: 28 },
    },
    didDrawPage: () => {
      // Footer on every page
      doc.setFillColor(...C.dark);
      doc.rect(0, H - 18, W, 18, "F");

      // Line 1 — Hospital name
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      doc.text(
        `${PDF_HOSPITAL_NAME} — ${PDF_HOSPITAL_ADDRESS}`,
        W / 2,
        H - 10,
        { align: "center" },
      );

      // Line 2 — Confidential stamp + timestamp
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.light);
      doc.text(
        `CONFIDENTIAL — Exported by ${params.generatedBy} on ${format(
          new Date(),
          "MMMM d, yyyy 'at' HH:mm",
        )} · SPRMS`,
        W / 2,
        H - 4,
        { align: "center" },
      );
    },
  });

  doc.save(
    `MSH-Zaria-Audit-Log-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`,
  );
}