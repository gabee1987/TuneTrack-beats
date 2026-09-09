import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

// Resolved from the working directory rather than `import.meta.url`: these guards run in
// the jsdom environment, where `import.meta.url` is not a `file:` URL.
export const SRC_ROOT = resolve(process.cwd(), "src");

if (!existsSync(join(SRC_ROOT, "app", "App.tsx"))) {
  throw new Error(
    `Guard tests expect to run with apps/web as the working directory; resolved ${SRC_ROOT}`,
  );
}

function walk(directory: string, matches: (name: string) => boolean): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);

    if (statSync(fullPath).isDirectory()) {
      found.push(...walk(fullPath, matches));
      continue;
    }

    if (matches(entry)) {
      found.push(fullPath);
    }
  }

  return found;
}

export interface SourceFile {
  /** Path relative to `src/`, always with forward slashes. */
  path: string;
  contents: string;
}

function toSourceFile(fullPath: string): SourceFile {
  return {
    path: relative(SRC_ROOT, fullPath).split(sep).join("/"),
    contents: readFileSync(fullPath, "utf8"),
  };
}

export function listCssModules(): SourceFile[] {
  return walk(SRC_ROOT, (name) => name.endsWith(".module.css")).map(toSourceFile);
}

export function listTypeScriptSources(): SourceFile[] {
  return walk(
    SRC_ROOT,
    (name) =>
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.endsWith(".test.ts") &&
      !name.endsWith(".test.tsx"),
  )
    .map(toSourceFile)
    .filter((file) => !file.path.startsWith("test/"));
}

/**
 * Ratchet assertion: the offending set must equal the allowlist exactly.
 *
 * A new offender fails because it is not in the list. A fixed offender also fails, which
 * forces the list to shrink as migrations land — so the allowlist cannot quietly become
 * permanent.
 */
export function expectRatchet(
  actual: readonly string[],
  allowlist: readonly string[],
): { newOffenders: string[]; fixedButStillListed: string[] } {
  const actualSet = new Set(actual);
  const allowedSet = new Set(allowlist);

  return {
    newOffenders: [...actualSet].filter((path) => !allowedSet.has(path)).sort(),
    fixedButStillListed: [...allowedSet].filter((path) => !actualSet.has(path)).sort(),
  };
}
