import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  consumeRateLimitToken,
  resetRateLimits,
} from "@/lib/rate-limit";

// Reset modules so `rate-limit.ts` re-evaluates with our mocked env.
const buildRequest = (
  headers: Record<string, string>,
  url = "http://localhost:3000/test",
) => {
  return new Request(url, { headers });
};

describe("isTrustedPublicCaller", () => {
  beforeEach(() => {
    vi.resetModules();
    resetRateLimits();
  });

  it("rejects when there are no headers and no mobile marker", async () => {
    const { isTrustedPublicCaller } = await import("@/lib/request-origin");
    const req = buildRequest({});
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(false);
  });

  it("accepts the X-Mobile-Client marker", async () => {
    const { isTrustedPublicCaller, isMobileClient } = await import("@/lib/request-origin");
    const req = buildRequest({ "x-mobile-client": "hms-mobile" });
    expect(isMobileClient(req as unknown as import("next/server").NextRequest)).toBe(true);
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(true);
  });

  it("accepts an allow-listed Origin header", async () => {
    const { isTrustedPublicCaller } = await import("@/lib/request-origin");
    const req = buildRequest({ origin: "http://localhost:3000" });
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(true);
  });

  it("rejects a non-allow-listed Origin header", async () => {
    const { isTrustedPublicCaller } = await import("@/lib/request-origin");
    const req = buildRequest({ origin: "https://malicious.example.com" });
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(false);
  });

  it("falls back to the Referer header when no Origin is present", async () => {
    const { isTrustedPublicCaller } = await import("@/lib/request-origin");
    const req = buildRequest({ referer: "http://localhost:3000/some/page" });
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(true);
  });

  it("rejects an unparseable Referer", async () => {
    const { isTrustedPublicCaller } = await import("@/lib/request-origin");
    const req = buildRequest({ referer: "not a url" });
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(false);
  });

  it("rejects a Referer from a non-allowed host", async () => {
    const { isTrustedPublicCaller } = await import("@/lib/request-origin");
    const req = buildRequest({ referer: "https://malicious.example.com/page" });
    expect(isTrustedPublicCaller(req as unknown as import("next/server").NextRequest)).toBe(false);
  });
});

describe("getClientIp", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prefers cf-connecting-ip", async () => {
    const { getClientIp } = await import("@/lib/request-origin");
    const req = buildRequest({
      "cf-connecting-ip": "203.0.113.1",
      "x-forwarded-for": "10.0.0.1",
      "x-real-ip": "127.0.0.1",
    });
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("203.0.113.1");
  });

  it("falls back to first value of x-forwarded-for", async () => {
    const { getClientIp } = await import("@/lib/request-origin");
    const req = buildRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 127.0.0.1" });
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", async () => {
    const { getClientIp } = await import("@/lib/request-origin");
    const req = buildRequest({ "x-real-ip": "203.0.113.9" });
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("203.0.113.9");
  });

  it("returns 'unknown' when no IP headers are present", async () => {
    const { getClientIp } = await import("@/lib/request-origin");
    const req = buildRequest({});
    expect(getClientIp(req as unknown as import("next/server").NextRequest)).toBe("unknown");
  });
});
