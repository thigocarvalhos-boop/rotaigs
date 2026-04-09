/**
 * In-memory sliding window rate limiter for Vercel serverless functions.
 *
 * IMPORTANT: Vercel Functions may spin up multiple instances, so this is
 * NOT a global rate limiter. It mitigates brute-force against a single
 * instance. For a truly global solution, use Redis (e.g. Upstash) or
 * a WAF (e.g. Vercel's built-in firewall or Cloudflare).
 *
 * This is an acceptable baseline for login protection in a Vercel deployment.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds to avoid unbounded memory
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Apply rate limiting to a request.
 *
 * @param key      - unique identifier (e.g. IP address or email)
 * @param limit    - max number of requests allowed in the window
 * @param windowMs - time window in milliseconds
 * @returns { allowed: boolean, remaining: number, retryAfterMs: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterMs = entry.resetAt - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/**
 * Extract client IP from Vercel request headers.
 * Vercel sets x-forwarded-for and x-real-ip headers automatically.
 */
export function getClientIp(req: any): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}
