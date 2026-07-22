import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const defaultEnvFilePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.env",
);

/**
 * Apply non-empty keys from apps/server/.env over inherited OS/shell env.
 * Empty keys are skipped so a blank template cannot wipe valid values —
 * but stale Windows User/Machine Spotify credentials can still shadow blanks.
 */
export function applyLocalEnvFile(
  filePath: string = defaultEnvFilePath,
  env: NodeJS.ProcessEnv = process.env,
): { appliedKeys: string[]; skippedEmptyKeys: string[] } {
  const appliedKeys: string[] = [];
  const skippedEmptyKeys: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { appliedKeys, skippedEmptyKeys };
  }

  // In Vitest, keep setup-file credentials authoritative.
  if (env.VITEST === "true" || env.NODE_ENV === "test") {
    return { appliedKeys, skippedEmptyKeys };
  }

  const parsed = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, rawValue] of Object.entries(parsed)) {
    const value = rawValue.trim();
    if (value.length === 0) {
      skippedEmptyKeys.push(key);
      continue;
    }

    env[key] = value;
    appliedKeys.push(key);
  }

  return { appliedKeys, skippedEmptyKeys };
}
