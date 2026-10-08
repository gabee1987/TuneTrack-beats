import { describe, expect, it } from "vitest";
import { motionDurations } from "./coreMotionTokens";
import { createSideSheetMotion, createSideSheetScrimMotion } from "./sideSheetMotionTokens";

describe("createSideSheetMotion", () => {
  /** A fading panel let the screen underneath flicker through it (owner report 2026-10-08). */
  it("never fades the panel, so nothing behind it shows through", () => {
    const targets = createSideSheetMotion(false);

    expect(Object.values(targets).some((target) => "opacity" in target)).toBe(false);
  });

  it("travels the full width in and out", () => {
    const targets = createSideSheetMotion(false);

    expect(targets.initial).toEqual({ x: "100%" });
    expect(targets.animate).toMatchObject({ x: 0 });
    expect(targets.exit).toMatchObject({ x: "100%" });
  });

  it("does not travel when reduced motion is requested", () => {
    const targets = createSideSheetMotion(true);

    expect(Object.values(targets).every((target) => target.x === 0)).toBe(true);
  });
});

describe("createSideSheetScrimMotion", () => {
  it("fades on the sheet's timing", () => {
    const scrim = createSideSheetScrimMotion(false);
    const sheet = createSideSheetMotion(false);

    expect(scrim.animate.transition).toMatchObject({ duration: motionDurations.screen });
    expect(sheet.animate.transition).toMatchObject({ duration: motionDurations.screen });
    expect(scrim.exit.transition).toMatchObject({ duration: motionDurations.standard });
    expect(sheet.exit.transition).toMatchObject({ duration: motionDurations.standard });
  });
});
