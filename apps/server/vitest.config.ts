import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
  },
});
