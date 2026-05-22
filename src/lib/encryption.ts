import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Ensure key is exactly 32 bytes
  return Buffer.from(key.padEnd(32, "0").slice(0, 32), "utf8");
}

function getIV(): Buffer {
  const iv = process.env.ENCRYPTION_IV;
  if (!iv) {
    throw new Error("ENCRYPTION_IV environment variable is not set");
  }
  // Ensure IV is exactly 16 bytes
  return Buffer.from(iv.padEnd(16, "0").slice(0, 16), "utf8");
}

/**
 * Encrypts a plain text string using AES-256-CBC
 * Returns a base64-encoded encrypted string
 */
export function encrypt(text: string): string {
  if (!text) return text;

  try {
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), getIV());
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypts a base64-encoded encrypted string
 * Returns the original plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), getIV());
    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, return as-is (might be plain text from old records)
    return encryptedText;
  }
}

/**
 * Encrypts an object's specific fields
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
 * Decrypts an object's specific fields
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
