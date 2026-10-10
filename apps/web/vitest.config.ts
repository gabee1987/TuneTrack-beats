import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Before the bare key, which would otherwise match this one as a prefix.
      "@tunetrack/shared/constants": fileURLToPath(
        new URL("../../packages/shared/src/constants/gameplay.ts", import.meta.url),
      ),
      "@tunetrack/shared/client": fileURLToPath(
        new URL("../../packages/shared/src/client.ts", import.meta.url),
      ),
      "@tunetrack/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
      "@tunetrack/game-engine": fileURLToPath(
        new URL("../../packages/game-engine/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      // The measured baseline (06 T3), rounded down. Raise to the new floor when tests are
      // added; never lower without a written reason in the same change.
      thresholds: { statements: 67, branches: 75, functions: 75, lines: 67 },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/test/**",
        "src/pages/DesignSystemPage/**",
        "src/**/*.test.{ts,tsx}",
      ],
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    pool: "threads",
    globals: false,
    // One environment for the whole workspace: a per-file split needs either the
    // deprecated `environmentMatchGlobs` or a filename convention, and neither is worth
    // the ambiguity for a suite this size.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
