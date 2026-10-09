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
});
