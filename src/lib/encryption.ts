// src/lib/encryption.ts

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

/**
 * Derives a 32-byte key from the environment variable.
 * Accepts any string — hashes it to ensure exactly 32 bytes.
 */
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Use SHA-256 to derive a consistent 32-byte key from any string
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypts a plain text string using AES-256-CBC with a RANDOM IV.
 *
 * Output format: base64(iv_bytes + encrypted_bytes)
 * The IV is prepended to the ciphertext so decryption can extract it.
 *
 * SECURITY NOTE: Each call generates a fresh random IV.
 * Same plaintext → different ciphertext every time. ✓
 */
export function encrypt(text: string): string {
  if (!text) return text;

  try {
    // Generate a fresh random IV for every encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(text, "utf8")),
      cipher.final(),
    ]);

    // Prepend IV to ciphertext → iv(16 bytes) + ciphertext
    const combined = Buffer.concat([iv, encrypted]);
    return combined.toString("base64");
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypts a base64-encoded string that was encrypted with encrypt().
 *
 * Handles both:
 * - New format: base64(iv + ciphertext) — from this updated encrypt()
 * - Old format: base64(ciphertext) with static IV — legacy fallback
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  try {
    const key = getKey();
    const combined = Buffer.from(encryptedText, "base64");

    // New format: first 16 bytes are the IV
    if (combined.length > IV_LENGTH) {
      const iv = combined.subarray(0, IV_LENGTH);
      const ciphertext = combined.subarray(IV_LENGTH);

      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        const decrypted = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return decrypted.toString("utf8");
      } catch {
        // Fall through to legacy attempt
      }
    }

    // Legacy fallback: try with static IV from environment
    // This handles records encrypted before this update
    const legacyIv = process.env.ENCRYPTION_IV;
    if (legacyIv) {
      try {
        const ivBuffer = Buffer.from(
          legacyIv.padEnd(16, "0").slice(0, 16),
          "utf8",
        );
        const legacyKey = Buffer.from(
          (process.env.ENCRYPTION_KEY ?? "")
            .padEnd(32, "0")
            .slice(0, 32),
          "utf8",
        );
        const decipher = crypto.createDecipheriv(
          ALGORITHM,
          legacyKey,
          ivBuffer,
        );
        let decrypted = decipher.update(encryptedText, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      } catch {
        // Legacy also failed — return as-is (plain text / corrupted)
        return encryptedText;
      }
    }

    return encryptedText;
  } catch {
    // If all decryption fails, return as-is
    return encryptedText;
  }
}

/**
 * Encrypts specific fields of an object in place (returns new object).
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = encrypt(result[field] as string) as T[keyof T];
    }
  }
  return result;
}

/**
 * Decrypts specific fields of an object in place (returns new object).
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = decrypt(result[field] as string) as T[keyof T];
    }
  }
  return result;
}