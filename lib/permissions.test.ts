import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
  requirePermission,
  requireSuperAdmin,
  PermissionDeniedError,
} from "@/lib/permissions";

vi.mock("@/lib/prisma", () => ({
  default: {
    staff: { findUnique: vi.fn() },
    permission: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
const mockedPrisma = prisma as unknown as {
  staff: { findUnique: ReturnType<typeof vi.fn> };
  permission: { findMany: ReturnType<typeof vi.fn> };
};

const staffWithRole = (perms: { name: string }[], isSuper = false) => ({
  id: "s-1",
  userId: "u-1",
  adminRole: {
    id: "r-1",
    name: "test",
    isSuperRole: isSuper,
    rolePermissions: perms.map((p) => ({ permission: p })),
  },
});

describe("hasPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the user has no admin role", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce({ adminRole: null });
    expect(await hasPermission("u-1", "admin.create")).toBe(false);
  });

  it("returns true when the role has the permission", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([{ name: "admin.create" }]));
    expect(await hasPermission("u-1", "admin.create")).toBe(true);
  });

  it("returns false when the role does not have the permission", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([{ name: "admin.read" }]));
    expect(await hasPermission("u-1", "admin.create")).toBe(false);
  });

  it("returns true for any permission when the role is Super", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([], true));
    mockedPrisma.permission.findMany.mockResolvedValueOnce([{ name: "admin.create" }]);
    expect(await hasPermission("u-1", "admin.create")).toBe(true);
  });
});

describe("hasAnyPermission / hasAllPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hasAnyPermission returns true if any one matches", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([{ name: "admin.read" }]));
    expect(await hasAnyPermission("u-1", ["admin.create", "admin.read"])).toBe(true);
  });

  it("hasAnyPermission returns false when none match", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([{ name: "x" }]));
    expect(await hasAnyPermission("u-1", ["admin.create", "admin.delete"])).toBe(false);
  });

  it("hasAllPermissions returns true only when all match", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(
      staffWithRole([{ name: "admin.create" }, { name: "admin.delete" }]),
    );
    expect(await hasAllPermissions("u-1", ["admin.create", "admin.delete"])).toBe(true);
    expect(await hasAllPermissions("u-1", ["admin.create", "admin.ban"])).toBe(false);
  });
});

describe("isSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when user has no role", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce({ adminRole: null });
    expect(await isSuperAdmin("u-1")).toBe(false);
  });

  it("returns true when role is Super", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([], true));
    expect(await isSuperAdmin("u-1")).toBe(true);
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws PermissionDeniedError when the permission is missing", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([{ name: "admin.read" }]));
    await expect(requirePermission("u-1", "admin.create")).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
  });

  it("resolves when the permission is granted", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([{ name: "admin.create" }]));
    await expect(requirePermission("u-1", "admin.create")).resolves.toBeUndefined();
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when not super", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([]));
    await expect(requireSuperAdmin("u-1")).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("resolves when super", async () => {
    mockedPrisma.staff.findUnique.mockResolvedValueOnce(staffWithRole([], true));
    await expect(requireSuperAdmin("u-1")).resolves.toBeUndefined();
  });
});
