import type { Transition } from "framer-motion";
import { describe, expect, it } from "vitest";
import {
  createAppShellMenuSheetMotionTargets,
  createAppShellMenuTransition,
} from "./appShellMotionTokens";
import { motionDurations } from "./coreMotionTokens";

describe("createAppShellMenuSheetMotionTargets", () => {
  /**
   * The fade is only safe because the scrim is a sibling of the sheet rather than its
   * ancestor — nested opacities multiply. `AppShellMenuDialog.test.tsx` holds that
   * structural half of the contract.
   */
  it("fades in over a slide", () => {
    const targets = createAppShellMenuSheetMotionTargets(false);

    expect(targets.initial).toEqual({ opacity: 0, x: 64 });
    expect(targets.animate).toEqual({ opacity: 1, x: 0 });
  });

  it("leaves the way it arrived", () => {
    const targets = createAppShellMenuSheetMotionTargets(false);

    expect(targets.exit).toEqual(targets.initial);
  });

  it("fades without travelling when reduced motion is requested", () => {
    const targets = createAppShellMenuSheetMotionTargets(true);

    expect(Object.values(targets).every((target) => target.x === 0)).toBe(true);
    expect(targets.animate.opacity).toBe(1);
  });
});

// `Transition` is a union covering springs and inertia, neither of which carries a
// duration, so reading one needs a narrowing.
function durationOf(transition: Transition): number | undefined {
  return (transition as { duration?: number }).duration;
}

describe("createAppShellMenuTransition", () => {
  /**
   * The scrim and the sheet are separate elements so their opacities do not multiply, which
   * is also what makes it easy to drift their timings apart. One shared transition is the
   * guard.
   */
  it("gives the whole menu one duration", () => {
    expect(durationOf(createAppShellMenuTransition(false))).toBe(motionDurations.standard);
  });

  it("collapses to an instant when reduced motion is requested", () => {
    expect(durationOf(createAppShellMenuTransition(true))).toBe(motionDurations.instant);
  });
});
