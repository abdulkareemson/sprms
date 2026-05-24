// src/lib/sanitize.ts

/**
 * Input sanitization helpers for SPRMS.
 * Applied at API layer before any DB operations.
 */

/**
 * Strips HTML tags and trims whitespace from a string.
 * Prevents stored XSS in text fields.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/javascript:/gi, "") // Strip JS protocol
    .replace(/on\w+\s*=/gi, "") // Strip inline event handlers
    .trim();
}

/**
 * Sanitizes all string fields in an object recursively.
 * Safe to use on Zod-validated data before DB write.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
): T {
  // FIX: Explicitly type as Record to allow index assignment
  const result: Record<string, unknown> = { ...obj };
  
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      result[key] = sanitizeString(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = sanitizeObject(val as Record<string, unknown>);
    }
  }
  
  // Cast back to generic T on return
  return result as T;
}

/**
 * Validates that a date string is a real, parseable date
 * and not in the far future or distant past.
 */
export function isValidDateOfBirth(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const minDate = new Date("1900-01-01");
  return date <= now && date >= minDate;
}

/**
 * Checks if a string could be a path traversal attack.
 */
export function hasDangerousPath(input: string): boolean {
  return (
    input.includes("..") ||
    input.includes("//") ||
    input.startsWith("/") ||
    /[<>:"\\|?*]/.test(input)
  );
}

/**
 * Sanitizes a filename for safe storage.
 * Removes path traversal chars, limits length.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Allow only safe chars
    .replace(/\.{2,}/g, ".") // Prevent ..
    .replace(/^[._]/, "") // Don't start with dot or underscore
    .substring(0, 100); // Max 100 chars
}