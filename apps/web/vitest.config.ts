import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@tunetrack/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
      "@tunetrack/game-engine": fileURLToPath(
        new URL("../../packages/game-engine/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
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
