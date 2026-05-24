// src/lib/rate-limit.ts

import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window algorithm.
 * NOTE: In production with multiple Vercel instances, use Redis (Upstash).
 * For this project (single instance / demo), in-memory is sufficient.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Global store (survives across requests in same process)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Key prefix to namespace different limiters */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limit.
 * Key is derived from IP address + optional prefix.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const { limit, windowSeconds, prefix = "rl" } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = store.get(key);

  // First request or window expired → create fresh entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, newEntry);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Within window — increment
  entry.count += 1;
  store.set(key, entry);

  if (entry.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract the best available IP identifier from a request.
 */
export function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Build a rate limit exceeded response with proper headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down and try again later.",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

/**
 * Predefined rate limit configs for different route types.
 */
export const RATE_LIMITS = {
  /** Auth endpoints — strict (5 attempts per 15 minutes) */
  AUTH: { limit: 5, windowSeconds: 15 * 60, prefix: "auth" },

  /** Password reset — very strict (3 per hour) */
  PASSWORD_RESET: { limit: 3, windowSeconds: 60 * 60, prefix: "pwd-reset" },

  /** Patient registration — moderate (10 per hour) */
  REGISTER: { limit: 10, windowSeconds: 60 * 60, prefix: "register" },

  /** General API reads — generous (120 per minute) */
  API_READ: { limit: 120, windowSeconds: 60, prefix: "api-read" },

  /** General API writes — moderate (30 per minute) */
  API_WRITE: { limit: 30, windowSeconds: 60, prefix: "api-write" },

  /** File upload — strict (10 per 10 minutes) */
  UPLOAD: { limit: 10, windowSeconds: 10 * 60, prefix: "upload" },

  /** Reports/exports — strict (20 per 10 minutes) */
  REPORTS: { limit: 20, windowSeconds: 10 * 60, prefix: "reports" },
} as const;
