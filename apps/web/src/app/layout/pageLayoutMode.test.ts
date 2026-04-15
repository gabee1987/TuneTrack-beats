import { describe, expect, it } from "vitest";
import {
  MOBILE_LAYOUT_COMPACT_WIDTH,
  resolvePageLayoutMode,
} from "./pageLayoutMode";

describe("pageLayoutMode", () => {
  it("uses mobile layout for compact widths even without coarse pointer", () => {
    expect(
      resolvePageLayoutMode({
        isCoarsePointer: false,
        viewportHeight: 900,
        viewportWidth: MOBILE_LAYOUT_COMPACT_WIDTH,
      }),
    ).toBe("mobile");
  });

  it("uses mobile layout for touch-first mid-width devices", () => {
    expect(
      resolvePageLayoutMode({
        isCoarsePointer: true,
        viewportHeight: 800,
        viewportWidth: 900,
      }),
    ).toBe("mobile");
  });

  it("uses desktop layout for wide fine-pointer devices", () => {
    expect(
      resolvePageLayoutMode({
        isCoarsePointer: false,
        viewportHeight: 900,
        viewportWidth: 1280,
      }),
    ).toBe("desktop");
  });
});
