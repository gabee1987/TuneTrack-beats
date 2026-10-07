import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { zIndexPrimitives } from "../../features/theme/tokens";
import { listCssModules, SRC_ROOT } from "./cssSourceFiles";

/**
 * Every layer comes from the `--z-*` scale (`design_system.md` §6). A literal in [-1, 9] is
 * the one exception: stacking inside a component, which can never escape its layer.
 */
const Z_INDEX_DECLARATION = /z-index\s*:\s*([^;}]+)/g;
const LOCAL_STACKING = /^-?\d+$/;

function toCssVariableName(primitiveName: string): string {
  return `--z-${primitiveName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

const scaleVariables = new Set(Object.keys(zIndexPrimitives).map(toCssVariableName));

function isAllowedZIndex(value: string): boolean {
  const tokenMatch = /^var\((--z-[\w-]+)\)$/.exec(value);

  if (tokenMatch) {
    return scaleVariables.has(tokenMatch[1] ?? "");
  }

  if (LOCAL_STACKING.test(value)) {
    const level = Number(value);
    return level >= -1 && level <= 9;
  }

  return false;
}

describe("z-index scale", () => {
  it("uses a --z-* token or a local value in [-1, 9] in every CSS module", () => {
    const offenders = listCssModules().flatMap((file) =>
      [...file.contents.matchAll(Z_INDEX_DECLARATION)]
        .map(([, value]) => (value ?? "").trim())
        .filter((value) => !isAllowedZIndex(value))
        .map((value) => `${file.path}: z-index ${value}`),
    );

    expect(
      offenders,
      "Use a --z-* layer token; only stacking inside a component may use -1 to 9.",
    ).toEqual([]);
  });

  it("declares exactly the zIndexPrimitives scale in globals.css", () => {
    const globals = readFileSync(join(SRC_ROOT, "app", "styles", "globals.css"), "utf8");
    const declared = Object.fromEntries(
      [...globals.matchAll(/(--z-[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
        name,
        (value ?? "").trim(),
      ]),
    );
    const expected = Object.fromEntries(
      Object.entries(zIndexPrimitives).map(([name, value]) => [toCssVariableName(name), value]),
    );

    expect(declared).toEqual(expected);
  });
});
