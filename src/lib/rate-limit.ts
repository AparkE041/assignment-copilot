/**
 * Simple in-memory rate limiting for API routes.
 * For production with multiple instances, use Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (e.g., IP + route).
 * Default: 5 requests per 15 minutes for auth endpoints.
 */
export function checkRateLimit(
  identifier: string,
  options: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const { limit = 5, windowMs = 15 * 60 * 1000 } = options;
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Existing window
  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers.
 * Works with Vercel, standard proxies, and direct connections.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  // Vercel-specific
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  // Standard forwarded headers
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback
  return "unknown";
}
