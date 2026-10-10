import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      // The measured baseline (06 T3), rounded down. Raise to the new floor when tests are
      // added; never lower without a written reason in the same change.
      thresholds: { statements: 68, branches: 86, functions: 77, lines: 68 },
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
