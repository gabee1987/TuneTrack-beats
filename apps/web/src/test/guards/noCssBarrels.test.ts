import { describe, expect, it } from "vitest";
import { expectRatchet, listTypeScriptSources } from "./cssSourceFiles";

/**
 * Spread-merging several CSS modules into one default export defeats per-component CSS
 * splitting (it is why the Lobby CSS chunk is 69 kB) and silently resolves duplicate class
 * names by import order.
 *
 * The six original barrels were dissolved in `05` WP D4 (2026-10-07); the allowlist stays empty.
 */
const PENDING_MIGRATION = [] as const;

const CSS_MODULE_IMPORT = /import\s+(\w+)\s+from\s+"[^"]*\.module\.css"/g;
const SPREAD_OF_STYLES = /\.\.\.\s*(\w+)/g;

function isCssModuleBarrel(contents: string): boolean {
  const importedNames = new Set([...contents.matchAll(CSS_MODULE_IMPORT)].map(([, name]) => name));

  if (importedNames.size < 2) {
    return false;
  }

  const spreadNames = [...contents.matchAll(SPREAD_OF_STYLES)].map(([, name]) => name);
  return spreadNames.filter((name) => importedNames.has(name)).length >= 2;
}

describe("no CSS module barrels", () => {
  const offenders = listTypeScriptSources()
    .filter((file) => isCssModuleBarrel(file.contents))
    .map((file) => file.path);

  it("does not spread-merge CSS modules", () => {
    const { newOffenders } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      newOffenders,
      "New CSS-module barrel. Import the specific stylesheets a component uses; if two " +
        "components share a class, move it to a small shared sheet instead.",
    ).toEqual([]);
  });

  it("keeps the pending-migration allowlist honest", () => {
    const { fixedButStillListed } = expectRatchet(offenders, PENDING_MIGRATION);

    expect(
      fixedButStillListed,
      "These barrels are gone. Remove them from PENDING_MIGRATION.",
    ).toEqual([]);
  });
});
