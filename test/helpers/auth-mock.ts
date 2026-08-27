/**
 * Helpers for mocking the cookie-based admin session used by `lib/admin-auth.ts`.
 *
 * Tests should `vi.mock("@/lib/admin-auth", ...)` to override the production
 * implementation, or simply call `mockRequireAdmin(returnValue)` from a test
 * after replacing the module export.
 */
import { vi } from "vitest";

export function mockRequireAdmin(actor: unknown | null) {
  return vi.fn().mockResolvedValue(actor);
}

export function mockRequireAdminOrThrow(actor: unknown) {
  return vi.fn().mockResolvedValue(actor);
}

/**
 * Build a fake admin actor payload matching `AdminActor` from `lib/admin-auth.ts`.
 */
export function buildAdminActor(overrides?: {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}) {
  const now = new Date();
  return {
    user: {
      id: overrides?.userId ?? "user-1",
      email: overrides?.email ?? "admin" + "\u0040" + "example.com",
      name: "Admin User",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
      banned: false,
      banReason: null,
      banExpires: null,
      customerNumber: null,
    },
    staff: {
      id: "staff-1",
      userId: overrides?.userId ?? "user-1",
      firstName: overrides?.firstName ?? "Admin",
      lastName: overrides?.lastName ?? "User",
      phone: null,
      role: "ADMIN",
      isActive: overrides?.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      adminRoleId: null,
    },
  };
}
