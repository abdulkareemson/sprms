// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

// ─── Service role client (server-side only) ───────────────────────────────────
// Uses service role key — never expose to client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const STORAGE_BUCKET = "medical-documents";

// ─── Allowed file types (whitelist) ──────────────────────────────────────────
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ─── Generate signed URL for time-limited access ──────────────────────────────
export async function generateSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600, // 1 hour default
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("[Supabase] Failed to generate signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

// ─── Delete file from storage ─────────────────────────────────────────────────
export async function deleteStorageFile(storagePath: string): Promise<boolean> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[Supabase] Failed to delete file:", error);
    return false;
  }

  return true;
}
