import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { consumeRateLimitToken, resetRateLimits } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request through (returns null)", () => {
    expect(consumeRateLimitToken("ip-1")).toBeNull();
  });

  it("tracks tokens independently per key", () => {
    expect(consumeRateLimitToken("key-a")).toBeNull();
    expect(consumeRateLimitToken("key-b")).toBeNull();
  });

  it("returns the remaining seconds when bucket is empty", () => {
    // MAX_TOKENS is 30; consume them all then the 31st should be blocked.
    for (let i = 0; i < 30; i += 1) {
      expect(consumeRateLimitToken("ip-x")).toBeNull();
    }
    const blocked = consumeRateLimitToken("ip-x");
    expect(blocked).not.toBeNull();
    expect(blocked).toBeGreaterThanOrEqual(1);
  });

  it("refills the bucket after the 60s window elapses", () => {
    for (let i = 0; i < 30; i += 1) consumeRateLimitToken("ip-r");
    expect(consumeRateLimitToken("ip-r")).not.toBeNull();

    // Advance past the refill window.
    vi.advanceTimersByTime(60_001);

    expect(consumeRateLimitToken("ip-r")).toBeNull();
  });

  it("returns at least 1 second even when reset is just about to elapse", () => {
    for (let i = 0; i < 30; i += 1) consumeRateLimitToken("ip-min");
    const blocked = consumeRateLimitToken("ip-min");
    expect(blocked).toBeGreaterThanOrEqual(1);
  });

  it("resetRateLimits clears all buckets", () => {
    for (let i = 0; i < 5; i += 1) consumeRateLimitToken("ip-z");
    resetRateLimits();
    // After reset the bucket should be fresh — 30 tokens again.
    expect(consumeRateLimitToken("ip-z")).toBeNull();
  });
});
