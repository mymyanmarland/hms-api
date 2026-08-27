import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks must come before the SUT import.
vi.mock("@/lib/prisma", () => {
  const transactionFn = vi.fn(async (cb: (tx: unknown) => unknown) =>
    cb({
      role: { create: vi.fn().mockResolvedValue({ id: "role-1", name: "front_desk" }) },
      rolePermission: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }),
  );
  return {
    default: {
      role: { findUnique: vi.fn(), create: vi.fn() },
      permission: { findUnique: vi.fn(), create: vi.fn() },
      rolePermission: { createMany: vi.fn() },
      staff: { findUnique: vi.fn() },
      $transaction: transactionFn,
    },
  };
});

vi.mock("@/lib/admin-auth", () => ({
  requireAdminOrThrow: vi.fn(),
  requireAdmin: vi.fn(),
  AdminForbiddenError: class AdminForbiddenError extends Error {},
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
  hasAnyPermission: vi.fn(),
  hasAllPermissions: vi.fn(),
  isSuperAdmin: vi.fn(),
  getStaffRole: vi.fn(),
  getUserRole: vi.fn(),
  getUserPermissions: vi.fn(),
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireAllPermissions: vi.fn(),
  requireSuperAdmin: vi.fn(),
  PermissionDeniedError: class PermissionDeniedError extends Error {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { createRoleAction } from "@/app/actions/roles";
import { requireAdminOrThrow, AdminForbiddenError } from "@/lib/admin-auth";
import { requirePermission, requireSuperAdmin } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const mockedAdmin = requireAdminOrThrow as unknown as ReturnType<typeof vi.fn>;
const mockedReqPerm = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockedReqSuper = requireSuperAdmin as unknown as ReturnType<typeof vi.fn>;
const mockedPrisma = prisma as unknown as {
  role: { findUnique: ReturnType<typeof vi.fn> };
};

const adminActor = { user: { id: "u-1" }, staff: { role: "ADMIN" } };

describe("createRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAdmin.mockResolvedValue(adminActor);
    mockedReqPerm.mockResolvedValue(undefined);
    mockedReqSuper.mockResolvedValue(undefined);
  });

  it("returns field errors when input is invalid", async () => {
    const r = await createRoleAction({ name: "" });
    expect(r.success).toBe(false);
    expect(r.fieldErrors?.name).toBeDefined();
  });

  it("returns 403-style error when caller is not admin", async () => {
    mockedAdmin.mockRejectedValueOnce(new AdminForbiddenError());
    const r = await createRoleAction({ name: "front_desk" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/admin/i);
  });

  it("returns error when caller lacks role.create permission", async () => {
    mockedReqPerm.mockRejectedValueOnce(new Error("forbidden"));
    const r = await createRoleAction({ name: "front_desk" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/create roles/i);
  });

  it("returns error when role name already exists", async () => {
    mockedPrisma.role.findUnique.mockResolvedValueOnce({ id: "existing", name: "front_desk" });
    const r = await createRoleAction({ name: "front_desk" });
    expect(r.success).toBe(false);
    expect(r.fieldErrors?.name).toBeDefined();
  });

  it("returns error when isSuperRole=true but caller is not super admin", async () => {
    mockedReqSuper.mockRejectedValueOnce(new Error("not super"));
    const r = await createRoleAction({ name: "super_role", isSuperRole: true });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/super admin/i);
  });

  it("happy path: creates a regular role with permission IDs", async () => {
    mockedPrisma.role.findUnique.mockResolvedValueOnce(null);
    const r = await createRoleAction({
      name: "front_desk",
      permissionIds: ["p-1", "p-2"],
    });
    expect(r.success).toBe(true);
  });
});
