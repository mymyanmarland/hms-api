import { describe, it, expect, beforeEach, vi } from "vitest";
import { writeAuditLog } from "@/lib/audit";

vi.mock("@/lib/prisma", () => ({
  default: { adminAuditLog: { create: vi.fn() } },
}));

import prisma from "@/lib/prisma";
const mockedPrisma = prisma as unknown as {
  adminAuditLog: { create: ReturnType<typeof vi.fn> };
};

describe("writeAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a row via Prisma when given an input payload", async () => {
    mockedPrisma.adminAuditLog.create.mockResolvedValueOnce({ id: "log-1" });
    await writeAuditLog({ action: "ADMIN_CREATE", actorStaffId: "s-1" });
    expect(mockedPrisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ADMIN_CREATE",
        actorStaffId: "s-1",
      }),
    });
  });

  it("defaults optional fields to null / undefined", async () => {
    mockedPrisma.adminAuditLog.create.mockResolvedValueOnce({ id: "log-1" });
    await writeAuditLog({ action: "ADMIN_UPDATE" });
    expect(mockedPrisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        action: "ADMIN_UPDATE",
        actorStaffId: null,
        targetStaffId: null,
        targetUserId: null,
        metadata: undefined,
      },
    });
  });

  it("forwards metadata when provided", async () => {
    mockedPrisma.adminAuditLog.create.mockResolvedValueOnce({ id: "log-1" });
    await writeAuditLog({
      action: "ADMIN_UPDATE",
      metadata: { field: "email", from: "a", to: "b" },
    });
    expect(mockedPrisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { field: "email", from: "a", to: "b" },
      }),
    });
  });

  it("swallows errors so audit failures never block the calling action", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockedPrisma.adminAuditLog.create.mockRejectedValueOnce(new Error("DB down"));
    await expect(writeAuditLog({ action: "ADMIN_DELETE" })).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
