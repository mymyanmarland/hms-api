/**
 * Tiny in-memory token bucket used by the public Direct Booking API.
 *
 * The bucket resets on every server restart, so it is suitable for the
 * widget's needs (preventing trivial scraping) but it is NOT a substitute
 * for a proper distributed rate limiter. Upgrade to Upstash / Vercel
 * KV if/when this widget receives significant production traffic.
 */

type Bucket = {
  tokens: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_TOKENS = 30;
const REFILL_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Returns `null` if the request is allowed, or the number of seconds
 * until the bucket refills when the request should be rejected.
 */
export function consumeRateLimitToken(key: string): number | null {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { tokens: MAX_TOKENS - 1, resetAt: now + REFILL_WINDOW_MS });
    return null;
  }

  if (existing.tokens <= 0) {
    return Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  }

  existing.tokens -= 1;
  return null;
}

/** Reset the bucket map (helpful for tests; not used in production). */
export function resetRateLimits(): void {
  buckets.clear();
}
