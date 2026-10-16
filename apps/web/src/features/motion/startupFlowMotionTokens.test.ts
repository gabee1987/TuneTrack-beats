import { describe, expect, it } from "vitest";
import {
  createCollapsingHeaderMotion,
  createPlayerArrivalMotion,
  createReadyMotion,
  createSelectionBarMotion,
  createStepDoneMotion,
  createTabSwapMotion,
} from "./startupFlowMotionTokens";

type Resolvable = Record<string, unknown> | ((custom: number) => Record<string, unknown>);

function resolve(target: unknown, custom = 0): Record<string, unknown> {
  const variant = target as Resolvable;
  return typeof variant === "function" ? variant(custom) : variant;
}

function durationOf(target: unknown, custom = 0): number | undefined {
  const transition = resolve(target, custom).transition as { duration?: number } | undefined;
  return transition?.duration;
}

describe("startup flow motion contracts (22 §10)", () => {
  it("grows players in one after another and lets them leave quickly", () => {
    const motion = createPlayerArrivalMotion(false);

    expect(resolve(motion.initial)).toMatchObject({ opacity: 0, scale: 0.8 });
    expect(resolve(motion.animate, 2)).toMatchObject({ opacity: 1, scale: 1 });
    expect(resolve(motion.animate, 2).transition).toMatchObject({ delay: 0.08, duration: 0.32 });
    expect(durationOf(motion.exit)).toBe(0.2);
  });

  it("settles a finished step and the ready Start button within their budgets", () => {
    const stepDone = createStepDoneMotion(false);
    const ready = createReadyMotion(false);

    expect(stepDone.initial).toMatchObject({ scale: 0.9 });
    expect(durationOf(stepDone.animate)).toBe(0.24);
    expect(ready.initial).toMatchObject({ scale: 0.96 });
    expect(durationOf(ready.animate)).toBe(0.46);
  });

  it("fades the new Music sheet tab in over 200 ms without fading the old one out first", () => {
    const swap = createTabSwapMotion(false);

    expect(swap.initial).toEqual({ opacity: 0 });
    expect(durationOf(swap.animate)).toBe(0.2);
    expect(swap.exit).toEqual({});
  });

  it("collapses the header across the scroll distance", () => {
    expect(createCollapsingHeaderMotion(false, 200)).toEqual({
      input: [0, 200],
      heroOpacity: [1, 0],
      heroScale: [1, 0.86],
      heroY: [0, -100],
      compactTitleOpacity: [0, 1],
    });
  });

  it("moves nothing under reduced motion and swaps the header halfway", () => {
    for (const motion of [
      createPlayerArrivalMotion(true),
      createStepDoneMotion(true),
      createReadyMotion(true),
      createSelectionBarMotion(true),
      createTabSwapMotion(true),
    ]) {
      for (const target of [motion.initial, motion.animate, motion.exit]) {
        const values = resolve(target);
        expect(values).not.toHaveProperty("scale");
        expect(values).not.toHaveProperty("y");
      }
    }

    expect(createCollapsingHeaderMotion(true, 200)).toMatchObject({
      input: [100, 101],
      heroScale: [1, 1],
      heroY: [0, 0],
    });
  });

  it("only ever animates transform and opacity", () => {
    const allowed = new Set(["opacity", "scale", "x", "y", "transition"]);
    const motions = [
      createPlayerArrivalMotion(false),
      createStepDoneMotion(false),
      createReadyMotion(false),
      createSelectionBarMotion(false),
      createTabSwapMotion(false),
    ];

    for (const motion of motions) {
      for (const target of [motion.initial, motion.animate, motion.exit]) {
        expect(Object.keys(resolve(target)).filter((key) => !allowed.has(key))).toEqual([]);
      }
    }
  });
});
