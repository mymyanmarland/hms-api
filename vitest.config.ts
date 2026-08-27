import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "build/**",
      "app/generated/**",
      "scripts/**",
    ],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["lib/**", "app/actions/**"],
      exclude: [
        "lib/auth.ts",
        "lib/auth-client.ts",
        "lib/prisma.ts",
        "lib/email/**",
        "lib/resend.ts",
        "lib/mail.ts",
        "app/generated/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types.ts",
      ],
    },
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    // Some Next.js modules (e.g. next/cache) are imported at module load time.
    // The vitest.setup file mocks them via vi.mock before any source loads.
  },
});
