import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyLocalEnvFile } from "../../src/app/applyLocalEnvFile.js";

const tempFiles: string[] = [];

afterEach(() => {
  for (const filePath of tempFiles.splice(0)) {
    fs.rmSync(filePath, { force: true });
  }
});

describe("applyLocalEnvFile", () => {
  it("applies non-empty .env values over inherited env", () => {
    const filePath = path.join(os.tmpdir(), `tunetrack-env-${Date.now()}.env`);
    tempFiles.push(filePath);
    fs.writeFileSync(
      filePath,
      ["SPOTIFY_CLIENT_ID=from-file", "SPOTIFY_CLIENT_SECRET=", "PORT=3001"].join("\n"),
      "utf8",
    );

    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "development",
      SPOTIFY_CLIENT_ID: "from-windows",
      SPOTIFY_CLIENT_SECRET: "from-windows-secret",
    };

    const result = applyLocalEnvFile(filePath, env);

    expect(result.appliedKeys).toEqual(["SPOTIFY_CLIENT_ID", "PORT"]);
    expect(result.skippedEmptyKeys).toEqual(["SPOTIFY_CLIENT_SECRET"]);
    expect(env.SPOTIFY_CLIENT_ID).toBe("from-file");
    expect(env.SPOTIFY_CLIENT_SECRET).toBe("from-windows-secret");
    expect(env.PORT).toBe("3001");
  });

  it("does not apply local .env during vitest runs", () => {
    const filePath = path.join(os.tmpdir(), `tunetrack-env-test-${Date.now()}.env`);
    tempFiles.push(filePath);
    fs.writeFileSync(filePath, "SPOTIFY_CLIENT_ID=from-file\n", "utf8");

    const env: NodeJS.ProcessEnv = {
      VITEST: "true",
      SPOTIFY_CLIENT_ID: "from-setup",
    };

    const result = applyLocalEnvFile(filePath, env);

    expect(result.appliedKeys).toEqual([]);
    expect(env.SPOTIFY_CLIENT_ID).toBe("from-setup");
  });
});
