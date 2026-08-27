import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    session: { deleteMany: vi.fn() },
  },
}));

import { POST as logout } from "@/app/api/auth/logout/route";
import prisma from "@/lib/prisma";
import { makeRequest } from "@/test/helpers/next-request";

const mockedPrisma = prisma as unknown as {
  session: { deleteMany: ReturnType<typeof vi.fn> };
};

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no session cookie is present", async () => {
    const req = makeRequest("http://localhost:3000/api/auth/logout", { method: "POST" });
    const res = await logout(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(mockedPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the session in the DB and redirects to /login", async () => {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    store.set("session", "tok-123");

    mockedPrisma.session.deleteMany.mockResolvedValueOnce({ count: 1 });

    const req = makeRequest("http://localhost:3000/api/auth/logout", { method: "POST" });
    const res = await logout(req);
    expect(res.status).toBe(307);
    expect(mockedPrisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: "tok-123" } });
  });

  it("redirects even if the DB delete throws (defensive)", async () => {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    store.set("session", "tok-bad");
    mockedPrisma.session.deleteMany.mockRejectedValueOnce(new Error("DB down"));

    const req = makeRequest("http://localhost:3000/api/auth/logout", { method: "POST" });
    const res = await logout(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
