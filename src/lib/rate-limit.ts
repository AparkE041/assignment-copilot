/**
 * Shared rate limiting utility.
 *
 * Primary store: Postgres via Prisma (works across Vercel instances).
 * Fallback store: in-memory map (used if DB is unavailable).
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex");
}

function getWindowStart(nowMs: number, windowMs: number): Date {
  return new Date(Math.floor(nowMs / windowMs) * windowMs);
}

function memoryRateLimit(
  identifier: string,
  options: { limit: number; windowMs: number; scope: string },
): RateLimitResult {
  const { limit, windowMs, scope } = options;
  const now = Date.now();
  const key = `${scope}:${identifier}`;
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check rate limit for a given identifier (e.g., IP + route).
 * Default: 5 requests per 15 minutes.
 */
export async function checkRateLimit(
  identifier: string,
  options: { limit?: number; windowMs?: number; scope?: string } = {},
): Promise<RateLimitResult> {
  const limit = options.limit ?? 5;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const scope = options.scope ?? "global";
  const nowMs = Date.now();
  const windowStart = getWindowStart(nowMs, windowMs);
  const resetAt = windowStart.getTime() + windowMs;
  const keyHash = hashIdentifier(identifier);

  try {
    const bucket = await prisma.apiRateLimit.upsert({
      where: {
        keyHash_scope_windowStart: {
          keyHash,
          scope,
          windowStart,
        },
      },
      create: {
        keyHash,
        scope,
        windowStart,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
      select: {
        count: true,
      },
    });

    // Opportunistic cleanup to keep the table compact.
    if (Math.random() < 0.01) {
      const staleBefore = new Date(nowMs - windowMs * 4);
      void prisma.apiRateLimit.deleteMany({
        where: {
          scope,
          windowStart: { lt: staleBefore },
        },
      });
    }

    const success = bucket.count <= limit;
    return {
      success,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt,
    };
  } catch (error) {
    console.warn("Rate limit DB fallback to memory:", error);
    return memoryRateLimit(identifier, { limit, windowMs, scope });
  }
}

export function getClientIpFromHeaders(headers: Headers): string {
  // Vercel-specific
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "unknown";

  // Standard forwarded headers
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}
