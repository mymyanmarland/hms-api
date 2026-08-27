/**
 * Helpers for mocking the Prisma client inside tests.
 *
 * Usage:
 *   import { vi } from "vitest";
 *   vi.mock("@/lib/prisma");
 *   import prisma from "@/lib/prisma";
 *   const { prismaMock } = await import("@/test/helpers/prisma-mock");
 *   prismaMock.user.findUnique.mockResolvedValue({ ... });
 */
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@/app/generated/prisma/client";

export type PrismaMock = DeepMockProxy<PrismaClient>;

export let prismaMock: PrismaMock = mockDeep<PrismaClient>();

/**
 * Reset all Prisma mocks between tests. Call this from `beforeEach`.
 */
export function resetPrismaMock(): void {
  mockReset(prismaMock);
  prismaMock = mockDeep<PrismaClient>();
}

export { mockDeep };
