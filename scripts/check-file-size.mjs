import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const MAX_LINES = 700;
const ROOTS = ["apps", "packages"];
const EXTENSIONS = [".ts", ".tsx", ".mjs"];
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
]);

// Files that were already over the limit when the gate landed. Each may only shrink; the work
// item that splits one deletes its entry (06-structure-and-test-plan.md §2.1).
const ALLOWLIST = {
  "apps/server/tests/roomFlow.test.ts": 1933,
  "apps/web/src/pages/GamePage/hooks/useGamePageActions.test.tsx": 1070,
  "packages/game-engine/tests/gameFlow.test.ts": 826,
  "apps/e2e/tests/room-entry.spec.ts": 848,
  "apps/web/src/pages/GamePage/hooks/useSpotifyPlaybackSdk.ts": 738,
  "apps/server/src/rooms/RoomService.ts": 709,
};

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) yield* walk(join(directory, entry.name));
    } else if (isCheckedFile(entry.name)) {
      yield join(directory, entry.name);
    }
  }
}

function isCheckedFile(name) {
  return !name.endsWith(".d.ts") && EXTENSIONS.some((extension) => name.endsWith(extension));
}

function countLines(path) {
  const text = readFileSync(path, "utf8");
  if (text.length === 0) return 0;
  const lineBreaks = text.match(/\n/g)?.length ?? 0;
  return text.endsWith("\n") ? lineBreaks : lineBreaks + 1;
}

const failures = [];
const seenAllowlisted = new Set();

for (const root of ROOTS) {
  for (const path of walk(root)) {
    const file = relative(".", path).split(sep).join("/");
    const lines = countLines(path);
    const allowedLines = ALLOWLIST[file];

    if (allowedLines !== undefined) {
      seenAllowlisted.add(file);
      if (lines > allowedLines) {
        failures.push(`${file}: ${lines} lines (allowlisted at ${allowedLines}, may only shrink)`);
      } else if (lines <= MAX_LINES) {
        failures.push(`${file}: ${lines} lines, now within the limit; remove its allowlist entry`);
      }
    } else if (lines > MAX_LINES) {
      failures.push(`${file}: ${lines} lines (limit ${MAX_LINES})`);
    }
  }
}

for (const file of Object.keys(ALLOWLIST)) {
  if (!seenAllowlisted.has(file)) {
    failures.push(`${file}: allowlisted but missing; remove its entry`);
  }
}

if (failures.length > 0) {
  console.error(`File-size check failed (${failures.length}):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
