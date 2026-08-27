/**
 * Vitest global setup — runs once before each test file.
 *
 * Mocks Next.js server-only modules so they can be imported in a Node test
 * environment without throwing. The Prisma client is also stubbed via
 * `vi.mock("@/lib/prisma")` inside individual helpers (test/helpers/prisma-mock.ts)
 * so tests can configure their own deep-mock per case.
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// `next/cache` exposes `revalidatePath`, `revalidateTag`, `unstable_cache`.
// In tests we never want a real cache; replace with no-op spies.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

// `next/headers` — read/write cookies inside Server Actions.
const cookiesStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookiesStore.get(name),
    set: (name: string, value: string) => {
      cookiesStore.set(name, { value });
    },
    delete: (name: string) => {
      cookiesStore.delete(name);
    },
    getAll: () => Array.from(cookiesStore.entries()).map(([name, v]) => ({ name, value: v.value })),
    has: (name: string) => cookiesStore.has(name),
  }),
  headers: async () => new Headers(),
}));

// `next/navigation` — used by some helpers for `redirect()` / `useRouter`.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// `next/server` — `NextRequest` / `NextResponse` constructors.
vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return actual;
});

// If globalThis.fetch is not defined (no jsdom), add a mock placeholder.
// When jsdom IS present it provides a real fetch which we use directly in tests.
if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
}
