import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@tunetrack/game-engine": fileURLToPath(
        new URL("../../packages/game-engine/src/index.ts", import.meta.url),
      ),
      // Before the bare key, which would otherwise match this one as a prefix.
      "@tunetrack/shared/constants": fileURLToPath(
        new URL("../../packages/shared/src/constants/gameplay.ts", import.meta.url),
      ),
      "@tunetrack/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      // The measured baseline (06 T3), rounded down. Raise to the new floor when tests are
      // added; never lower without a written reason in the same change.
      thresholds: { statements: 77, branches: 82, functions: 84, lines: 77 },
      include: ["src/**/*.ts"],
    },
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
  },
});
