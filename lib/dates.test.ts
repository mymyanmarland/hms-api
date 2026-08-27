import { describe, it, expect } from "vitest";
import {
  normalizeToUtcStart,
  toIsoDate,
  nightsBetween,
  addDays,
} from "@/lib/dates";

describe("normalizeToUtcStart", () => {
  it("parses YYYY-MM-DD into a Date at UTC midnight", () => {
    const result = normalizeToUtcStart("2026-03-08");
    expect(result.toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });

  it("handles the first day of the year", () => {
    const result = normalizeToUtcStart("2026-01-01");
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles the last day of the year", () => {
    const result = normalizeToUtcStart("2026-12-31");
    expect(result.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
});

describe("toIsoDate", () => {
  it("formats a Date as YYYY-MM-DD in UTC", () => {
    const d = new Date(Date.UTC(2026, 4, 7)); // May 7
    expect(toIsoDate(d)).toBe("2026-05-07");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(Date.UTC(2026, 0, 3)); // Jan 3
    expect(toIsoDate(d)).toBe("2026-01-03");
  });

  it("round-trips with normalizeToUtcStart", () => {
    const iso = "2026-08-27";
    expect(toIsoDate(normalizeToUtcStart(iso))).toBe(iso);
  });
});

describe("nightsBetween", () => {
  it("returns 0 for same-day check-in and check-out", () => {
    expect(nightsBetween("2026-03-08", "2026-03-08")).toBe(0);
  });

  it("counts inclusive nights correctly for a 1-night stay", () => {
    expect(nightsBetween("2026-03-08", "2026-03-09")).toBe(1);
  });

  it("counts multi-night stays", () => {
    expect(nightsBetween("2026-03-08", "2026-03-15")).toBe(7);
  });

  it("handles month boundary (Feb 28 → Mar 1 in non-leap year)", () => {
    expect(nightsBetween("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("handles year boundary (Dec 31 → Jan 1)", () => {
    expect(nightsBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("is timezone-safe (UTC math, no DST drift)", () => {
    const nights = nightsBetween("2026-03-08", "2026-03-09");
    expect(nights).toBe(1);
  });
});

describe("addDays", () => {
  it("adds 1 day to a date", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });

  it("adds 7 days to a date", () => {
    expect(addDays("2026-03-08", 7)).toBe("2026-03-15");
  });

  it("subtracts when negative (passing -1)", () => {
    expect(addDays("2026-03-08", -1)).toBe("2026-03-07");
  });

  it("crosses month boundary", () => {
    expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
  });

  it("crosses year boundary", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("returns the same date when 0 days are added", () => {
    expect(addDays("2026-03-08", 0)).toBe("2026-03-08");
  });
});
