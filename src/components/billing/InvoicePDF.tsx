// src/components/billing/InvoicePDF.tsx

"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface PDFPatient {
  firstName: string;
  lastName: string;
  patientNumber: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
}

interface PDFAppointment {
  scheduledAt: string;
  type: string;
  doctor?: {
    staffProfile?: {
      firstName: string;
      lastName: string;
      specialization?: string | null;
    } | null;
  } | null;
}

export interface InvoicePDFData {
  id: string;
  invoiceNumber: string;
  patient: PDFPatient;
  appointment?: PDFAppointment | null;
  items: InvoiceItem[];
  totalAmount: number;
  paymentStatus: "PENDING" | "PAID" | "OVERDUE";
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface InvoicePDFProps {
  invoice: InvoicePDFData;
  variant?: "button" | "icon";
}

// ─── Appointment type labels ──────────────────────────────────────────────────

const appointmentTypeLabels: Record<string, string> = {
  CONSULTATION: "Consultation",
  FOLLOW_UP: "Follow-up",
  PROCEDURE: "Procedure",
  LAB_TEST: "Lab Test",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  EMERGENCY: "Emergency",
};

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // blue-600
  primaryDark: [29, 78, 216] as [number, number, number], // blue-700
  accent: [99, 102, 241] as [number, number, number], // indigo-500
  success: [16, 185, 129] as [number, number, number], // emerald-500
  warning: [245, 158, 11] as [number, number, number], // amber-500
  danger: [239, 68, 68] as [number, number, number], // red-500
  dark: [15, 23, 42] as [number, number, number], // slate-900
  mid: [71, 85, 105] as [number, number, number], // slate-500
  light: [148, 163, 184] as [number, number, number], // slate-400
  muted: [226, 232, 240] as [number, number, number], // slate-200
  background: [248, 250, 252] as [number, number, number], // slate-50
  white: [255, 255, 255] as [number, number, number],
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generateInvoicePDF(invoice: InvoicePDFData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 0;

  // ── Helper: set fill + draw rect ──────────────────────────────────────────
  const fillRect = (
    x: number,
    ry: number,
    w: number,
    h: number,
    color: [number, number, number],
  ) => {
    doc.setFillColor(...color);
    doc.rect(x, ry, w, h, "F");
  };

  // ── HEADER BANNER ─────────────────────────────────────────────────────────
  fillRect(0, 0, W, 42, COLORS.primary);

  // Diagonal accent stripe
  doc.setFillColor(...COLORS.accent);
  doc.triangle(W - 60, 0, W, 0, W, 42, "F");

  // Hospital name
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SPRMS", 14, 16);

  // Sub-title
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(187, 210, 255);
  doc.text("Secure Patient Record Management System", 14, 23);
  doc.text("Ahmadu Bello University Teaching Hospital, Zaria", 14, 29);

  // INVOICE label on right
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("INVOICE", W - 14, 18, { align: "right" });

  // Invoice number
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(187, 210, 255);
  doc.text(invoice.invoiceNumber, W - 14, 26, { align: "right" });

  y = 52;

  // ── STATUS BADGE ──────────────────────────────────────────────────────────
  const statusColors: Record<string, [number, number, number]> = {
    PAID: COLORS.success,
    PENDING: COLORS.warning,
    OVERDUE: COLORS.danger,
  };
  const statusColor = statusColors[invoice.paymentStatus] ?? COLORS.mid;

  fillRect(W - 50, 46, 36, 8, statusColor);
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.paymentStatus, W - 32, 51.5, { align: "center" });

  // ── BILLING INFO GRID ─────────────────────────────────────────────────────
  // Left: Bill To
  fillRect(14, y, 85, 5, COLORS.muted);
  doc.setTextColor(...COLORS.mid);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 16, y + 3.5);

  y += 7;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${invoice.patient.firstName} ${invoice.patient.lastName}`, 14, y);

  y += 5.5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text(`Patient ID: ${invoice.patient.patientNumber}`, 14, y);

  if (invoice.patient.phone) {
    y += 4.5;
    doc.text(`Phone: ${invoice.patient.phone}`, 14, y);
  }
  if (invoice.patient.email) {
    y += 4.5;
    doc.text(`Email: ${invoice.patient.email}`, 14, y);
  }
  if (invoice.patient.address) {
    y += 4.5;
    const addrParts = [
      invoice.patient.address,
      invoice.patient.city,
      invoice.patient.state,
    ]
      .filter(Boolean)
      .join(", ");
    doc.text(addrParts, 14, y);
  }
  if (invoice.patient.insuranceProvider) {
    y += 4.5;
    doc.text(
      `Insurance: ${invoice.patient.insuranceProvider}` +
        (invoice.patient.insuranceNumber
          ? ` (${invoice.patient.insuranceNumber})`
          : ""),
      14,
      y,
    );
  }

  // Right: Invoice Details
  const detailsX = W / 2 + 10;
  let detailsY = 52 + 7;

  fillRect(detailsX, 52, W - detailsX - 14, 5, COLORS.muted);
  doc.setTextColor(...COLORS.mid);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE DETAILS", detailsX + 2, 52 + 3.5);

  const details: [string, string][] = [
    ["Invoice Number", invoice.invoiceNumber],
    ["Invoice Date", format(new Date(invoice.createdAt), "MMMM d, yyyy")],
    ["Status", invoice.paymentStatus],
    ...(invoice.paidAt
      ? [
          [
            "Payment Date",
            format(new Date(invoice.paidAt), "MMMM d, yyyy"),
          ] as [string, string],
        ]
      : []),
    ...(invoice.appointment
      ? [
          [
            "Appointment",
            `${appointmentTypeLabels[invoice.appointment.type] ?? invoice.appointment.type} — ${format(new Date(invoice.appointment.scheduledAt), "MMM d, yyyy")}`,
          ] as [string, string],
          ...(invoice.appointment.doctor?.staffProfile
            ? [
                [
                  "Attending Doctor",
                  `Dr. ${invoice.appointment.doctor.staffProfile.firstName} ${invoice.appointment.doctor.staffProfile.lastName}`,
                ] as [string, string],
              ]
            : []),
        ]
      : []),
  ];

  details.forEach(([label, value]) => {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.mid);
    doc.text(label, detailsX + 2, detailsY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    doc.text(value, W - 14, detailsY, { align: "right" });
    detailsY += 5.5;
  });

  // Push y past both columns
  y = Math.max(y, detailsY) + 10;

  // ── DIVIDER ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
  y += 8;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  const items = invoice.items as InvoiceItem[];

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        { content: "#", styles: { halign: "center", cellWidth: 10 } },
        { content: "Description", styles: { halign: "left" } },
        { content: "Qty", styles: { halign: "center", cellWidth: 15 } },
        { content: "Unit Price", styles: { halign: "right", cellWidth: 35 } },
        { content: "Amount", styles: { halign: "right", cellWidth: 35 } },
      ],
    ],
    body: items.map((item, i) => [
      { content: String(i + 1), styles: { halign: "center" } },
      { content: item.description },
      { content: String(item.quantity), styles: { halign: "center" } },
      {
        content: `₦${item.unitPrice.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
        styles: { halign: "right" },
      },
      {
        content: `₦${item.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
        styles: { halign: "right", fontStyle: "bold" },
      },
    ]),
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.dark,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: COLORS.background,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
    },
    tableLineColor: COLORS.muted,
    tableLineWidth: 0.2,
  });

  y =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 6;

  // ── TOTALS BLOCK ──────────────────────────────────────────────────────────
  const totalsX = W - 14 - 75;

  // Background
  fillRect(totalsX, y, 75, 24, COLORS.background);
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.2);
  doc.rect(totalsX, y, 75, 24);

  // Subtotal row
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mid);
  doc.text("Subtotal:", totalsX + 4, y + 7);
  doc.setTextColor(...COLORS.dark);
  doc.text(
    `₦${invoice.totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
    W - 18,
    y + 7,
    { align: "right" },
  );

  // Divider inside totals
  doc.setDrawColor(...COLORS.muted);
  doc.line(totalsX + 4, y + 10, W - 18, y + 10);

  // Total row with highlight
  fillRect(totalsX, y + 11, 75, 13, COLORS.primary);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("TOTAL DUE:", totalsX + 4, y + 19.5);
  doc.text(
    `₦${invoice.totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
    W - 18,
    y + 19.5,
    { align: "right" },
  );

  y += 30;

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    y += 4;
    fillRect(14, y, W - 28, 5.5, COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.mid);
    doc.text("NOTES", 16, y + 3.8);
    y += 8;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    const noteLines = doc.splitTextToSize(invoice.notes, W - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 6;
  }

  // ── PAYMENT STATUS BANNER ─────────────────────────────────────────────────
  if (invoice.paymentStatus === "PAID") {
    // Simulate watermark with a very light green color (no GState needed)
    doc.setTextColor(200, 240, 220); // light mint — visible but non-intrusive
    doc.setFontSize(80);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", W / 2, H / 2 + 20, {
      align: "center",
      angle: 35,
    });
    // Reset text color
    doc.setTextColor(...COLORS.dark);
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  fillRect(0, H - 20, W, 20, COLORS.dark);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.light);
  doc.text(
    "Thank you for choosing SPRMS Healthcare. For queries, contact billing@sprms.hospital.ng",
    W / 2,
    H - 12,
    { align: "center" },
  );
  doc.text(
    `Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`,
    W / 2,
    H - 7,
    { align: "center" },
  );

  // ── SAVE ──────────────────────────────────────────────────────────────────
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

// ─── Export Button Component ──────────────────────────────────────────────────

export function InvoicePDFButton({
  invoice,
  variant = "button",
}: InvoicePDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Small delay so UI updates before heavy PDF work
      await new Promise((r) => setTimeout(r, 100));
      generateInvoicePDF(invoice);
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handleDownload}
        disabled={isGenerating}
        title="Download PDF"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className="h-9 gap-2 text-sm"
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
