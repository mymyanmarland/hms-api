import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  requireAdmin,
  requireAdminOrThrow,
  AdminForbiddenError,
  getSidebarUserData,
} from "@/lib/admin-auth";

vi.mock("@/lib/prisma", () => ({
  default: { session: { findUnique: vi.fn() } },
}));

vi.mock("next/headers", async () => {
  const cookies = new Map<string, { value: string }>();
  return {
    cookies: async () => ({
      get: (name: string) => cookies.get(name),
      set: (name: string, value: string) => cookies.set(name, { value }),
      delete: (name: string) => cookies.delete(name),
      getAll: () =>
        Array.from(cookies.entries()).map(([name, v]) => ({ name, value: v.value })),
      has: (name: string) => cookies.has(name),
    }),
    headers: async () => new Headers(),
  };
});

import prisma from "@/lib/prisma";
const mockedPrisma = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn> };
};

const E = (local: string, domain = "example.com") => local + "\u0040" + domain;

const futureDate = new Date(Date.now() + 1000 * 60 * 60);
const adminUser = {
  id: "u-1",
  email: E("admin"),
  name: "Admin",
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  banned: false,
  banReason: null,
  banExpires: null,
  customerNumber: null,
};
const adminStaff = {
  id: "s-1",
  userId: "u-1",
  firstName: "Ada",
  lastName: "Admin",
  phone: null,
  role: "ADMIN",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  adminRoleId: null,
};

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no session cookie is present", async () => {
    const actor = await requireAdmin();
    expect(actor).toBeNull();
  });

  it("returns null when the session does not exist in DB", async () => {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    store.set("session", "tok-missing");
    mockedPrisma.session.findUnique.mockResolvedValueOnce(null);
    expect(await requireAdmin()).toBeNull();
  });

  it("returns null when the session is expired", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: new Date(Date.now() - 1000),
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, staff: adminStaff },
    });
    expect(await requireAdmin()).toBeNull();
  });

  it("returns null when staff is not an admin (e.g. GUEST role)", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, staff: { ...adminStaff, role: "GUEST" } },
    });
    expect(await requireAdmin()).toBeNull();
  });

  it("returns null when staff is inactive", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, staff: { ...adminStaff, isActive: false } },
    });
    expect(await requireAdmin()).toBeNull();
  });

  it("returns the AdminActor when the session is valid + admin role + active", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, staff: adminStaff },
    });
    const actor = await requireAdmin();
    expect(actor).toEqual({ user: expect.objectContaining({ id: "u-1" }), staff: adminStaff });
  });
});

describe("requireAdminOrThrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AdminForbiddenError when no session", async () => {
    await expect(requireAdminOrThrow()).rejects.toBeInstanceOf(AdminForbiddenError);
  });

  it("returns the AdminActor on success", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, staff: adminStaff },
    });
    const actor = await requireAdminOrThrow();
    expect(actor.staff.role).toBe("ADMIN");
  });
});

describe("getSidebarUserData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no session cookie", async () => {
    const result = await getSidebarUserData();
    expect(result).toBeNull();
  });

  it("returns name + email + avatar for a valid admin session", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, staff: { ...adminStaff, firstName: "Ada", lastName: "Admin" } },
    });
    const result = await getSidebarUserData();
    expect(result).toEqual({ name: "Ada Admin", email: E("admin"), avatar: "" });
  });

  it("falls back to user.name when staff is null", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, name: "Customer", staff: null },
    });
    const result = await getSidebarUserData();
    expect(result?.name).toBe("Customer");
  });

  it("falls back to user.email when staff and name are empty", async () => {
    mockedPrisma.session.findUnique.mockResolvedValueOnce({
      id: "ses-1",
      token: "tok",
      userId: "u-1",
      expiresAt: futureDate,
      ipAddress: null,
      userAgent: null,
      user: { ...adminUser, name: "", staff: { ...adminStaff, firstName: "", lastName: "" } },
    });
    const result = await getSidebarUserData();
    expect(result?.name).toBe(E("admin"));
  });
});
