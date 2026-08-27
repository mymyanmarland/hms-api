import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    roomType: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/booking-conflict", () => ({
  findBookingConflict: vi.fn().mockResolvedValue(null),
}));

import { GET, POST } from "@/app/api/public/availability/route";
import prisma from "@/lib/prisma";
import { makeRequest } from "@/test/helpers/next-request";
import { resetRateLimits } from "@/lib/rate-limit";

const mockedPrisma = prisma as unknown as {
  roomType: { findMany: ReturnType<typeof vi.fn> };
};

const today = new Date().toISOString().slice(0, 10);
const tomorrow = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();

describe("GET /api/public/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("returns 403 when the origin is not allow-listed", async () => {
    const req = makeRequest("https://malicious.example.com/api/public/availability", {
      searchParams: { checkIn: today, checkOut: tomorrow, adults: "1", children: "0" },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid query params", async () => {
    const req = makeRequest("http://localhost:3000/api/public/availability", {
      headers: { origin: "http://localhost:3000" },
      searchParams: { checkIn: "bad-date", checkOut: tomorrow, adults: "1" },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns results for a valid allow-listed GET request", async () => {
    mockedPrisma.roomType.findMany.mockResolvedValueOnce([]);
    const req = makeRequest("http://localhost:3000/api/public/availability", {
      headers: { origin: "http://localhost:3000" },
      searchParams: { checkIn: today, checkOut: tomorrow, adults: "2", children: "0" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.range).toBeDefined();
  });
});

describe("POST /api/public/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("returns 400 when JSON body is invalid", async () => {
    const req = makeRequest("http://localhost:3000/api/public/availability", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: { not: "json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Zod validation fails", async () => {
    const req = makeRequest("http://localhost:3000/api/public/availability", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: { checkIn: "bad-date", checkOut: tomorrow, adults: 1 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns results on valid POST JSON", async () => {
    mockedPrisma.roomType.findMany.mockResolvedValueOnce([]);
    const req = makeRequest("http://localhost:3000/api/public/availability", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: { checkIn: today, checkOut: tomorrow, adults: 1, children: 0 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 429 after the rate-limit window is exhausted", async () => {
    // Each iteration passes the trusted-origin + rate-limit guards, but the
    // handler then hits `findBookingConflict` 0 times (no rooms), so we
    // just smoke-test the rate-limit guard itself by looping 31 calls.
    mockedPrisma.roomType.findMany.mockResolvedValue([]);
    for (let i = 0; i < 30; i += 1) {
      const r = await GET(
        makeRequest("http://localhost:3000/api/public/availability", {
          headers: { origin: "http://localhost:3000" },
          searchParams: { checkIn: today, checkOut: tomorrow, adults: "1" },
        }),
      );
      expect(r.status).toBe(200);
    }
    const last = await GET(
      makeRequest("http://localhost:3000/api/public/availability", {
        headers: { origin: "http://localhost:3000" },
        searchParams: { checkIn: today, checkOut: tomorrow, adults: "1" },
      }),
    );
    expect(last.status).toBe(429);
    expect(last.headers.get("Retry-After")).toBeDefined();
  });
});
