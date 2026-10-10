import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@tunetrack/shared/constants": fileURLToPath(
        new URL("../shared/src/constants/gameplay.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      // The default v8 remapping counted a different branch total per run (88.92–89 %), so the
      // gate failed at random; the AST-aware count is identical on every run.
      experimentalAstAwareRemapping: true,
      reporter: ["text", "json-summary", "lcov"],
      // The measured baseline, rounded down. Raise to the new floor when tests are added; never
      // lower without a written reason in the same change. Lowered from 94/89/100/94 on
      // 2026-10-10: the AST-aware count measures 92.41/88.71/100/92.08 for the same tests.
      thresholds: { statements: 92, branches: 88, functions: 100, lines: 92 },
      include: ["src/**/*.ts"],
    },
  },
});
