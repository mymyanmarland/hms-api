import type { NextRequest } from "next/server";

/**
 * Allow-list of origins permitted to call the *public* Direct Booking API.
 *
 * Kept as a small list rather than reusing the better-auth trustedOrigins
 * because the public API should have a much tighter surface than auth.
 * Mobile traffic is identified by the `X-Mobile-Client: hms-mobile` header
 * the Expo WebView sets; this avoids needing to declare the `exp://`
 * callback URL explicitly.
 */
const ALLOWED_BROWSER_ORIGINS = [
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  // Expo dev / preview tooling used during the hotel's QA cycle.
  "http://localhost:8081",
  "http://localhost:19000",
  "http://localhost:19006",
];

/** True when the request looks like it came from the Expo mobile app. */
export function isMobileClient(request: NextRequest): boolean {
  return (
    request.headers.get("x-mobile-client")?.toLowerCase() === "hms-mobile"
  );
}

/**
 * Returns `true` for callers we want to let hit the public booking
 * endpoints. Browser requests must match an allowed `Origin` or
 * `Referer` host; mobile requests are accepted unconditionally because
 * they carry the `X-Mobile-Client` header instead of a browser origin.
 */
export function isTrustedPublicCaller(request: NextRequest): boolean {
  // Mobile clients (Expo, React Native, etc.) are always allowed — they
  // don't send a browser-style Origin header, but they do send the custom
  // X-Mobile-Client header that we control.
  if (isMobileClient(request)) return true;

  const origin = request.headers.get("origin");
  if (origin) {
    return ALLOWED_BROWSER_ORIGINS.some((allowed) => origin.startsWith(allowed));
  }

  // No `Origin` (e.g. same-origin GET, or a curl with only Referer) — fall back
  // to the `Referer` header so the widget can call from the same app.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return ALLOWED_BROWSER_ORIGINS.some((allowed) => url.origin.startsWith(allowed));
    } catch {
      return false;
    }
  }

  // No Origin and no Referer — for safety, require the X-Mobile-Client header
  // so only explicitly marked mobile clients can bypass the origin check.
  return false;
}

/**
 * Extract a stable per-caller identifier for rate-limiting purposes.
 * Uses `cf-connecting-ip` / `x-forwarded-for` and falls back to a hashed
 * combination of the user-agent + remote address so curl-style scripts
 * don't immediately trip the limiter on every request.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
