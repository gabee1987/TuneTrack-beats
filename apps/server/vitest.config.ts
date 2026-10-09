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
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
  },
});
