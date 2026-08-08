// src/lib/pdfUtils.ts

/**
 * Shared PDF utility helpers.
 * Used by InvoicePDF, ReportPDF, and AuditLogPDF.
 */

// ─── Branding Constants ───────────────────────────────────────────────────────

export const PDF_HOSPITAL_NAME    = "Muslim Specialist Hospital, Zaria";
export const PDF_HOSPITAL_ADDRESS = "Danmagaji, Tukur Tukur, Zaria, Kaduna State";
export const PDF_APP_NAME         = "Secure Patient Record Management System";

// ─── Logo Loader ──────────────────────────────────────────────────────────────

/**
 * Fetches /msh-logo.png from the public folder and converts
 * it to a base64 data URL so jsPDF can embed it.
 *
 * Returns null if the fetch fails — callers must handle
 * the null case gracefully (render without logo).
 */
export async function loadLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch("/msh-logo.png");
    if (!response.ok) return null;

    const blob       = await response.blob();
    const base64     = await blobToBase64(blob);
    return base64;
  } catch {
    console.warn("[pdfUtils] Could not load logo:", );
    return null;
  }
}

/**
 * Converts a Blob to a base64 data URL string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader  = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Logo Dimensions ─────────────────────────────────────────────────────────

/**
 * Standard logo dimensions used across all PDF headers.
 * White background logo sits inside a white rounded rect
 * on the dark blue/red banner.
 *
 * logoW × logoH = rendered size in mm inside the PDF.
 * padX, padY    = position from top-left of the page.
 */
export const LOGO_CONFIG = {
  padX   : 12,   // mm from left edge
  padY   : 4,    // mm from top edge
  logoW  : 22,   // mm width of rendered logo
  logoH  : 22,   // mm height of rendered logo
  bgPad  : 2,    // mm padding around logo inside white rect
} as const;

/**
 * Draws the logo + white background rect onto the PDF doc.
 * Call this AFTER drawing the header banner so the logo
 * sits on top of the banner color.
 *
 * @param doc     - jsPDF instance
 * @param logoB64 - base64 string from loadLogoBase64()
 *                  pass null to skip silently
 */
export function drawLogo(
  doc     : import("jspdf").jsPDF,
  logoB64 : string | null,
): void {
  if (!logoB64) return;

  const { padX, padY, logoW, logoH, bgPad } = LOGO_CONFIG;

  // White rounded background behind the logo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(
    padX - bgPad,
    padY - bgPad,
    logoW + bgPad * 2,
    logoH + bgPad * 2,
    2,
    2,
    "F",
  );

  // Embed the logo image
  doc.addImage(
    logoB64,
    "PNG",
    padX,
    padY,
    logoW,
    logoH,
    undefined,
    "FAST",
  );
}

/**
 * Returns the X offset that text should start at
 * when a logo is present, so text never overlaps the logo.
 */
export function textStartX(hasLogo: boolean): number {
  const { padX, logoW, bgPad } = LOGO_CONFIG;
  return hasLogo ? padX + logoW + bgPad * 2 + 4 : 14;
}