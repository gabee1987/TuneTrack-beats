import type { Target } from "framer-motion";
import { describe, expect, it } from "vitest";
import { createPageTransitionVariants } from "./coreMotionTokens";

function resolveExit(exit: unknown, direction: number) {
  if (typeof exit !== "function") {
    return exit;
  }

  return (exit as (custom: number, current: Target, velocity: Target) => unknown)(
    direction,
    {},
    {},
  );
}

/**
 * Defect B10 mitigation: under `mode="sync"` a second navigation landing mid-exit can
 * leave the previous page mounted. Since it is full-viewport and absolutely positioned,
 * an orphaned exiting page must never intercept taps.
 */
describe("createPageTransitionVariants", () => {
  it("keeps the exiting page transparent to input, with and without reduced motion", () => {
    const resolved = resolveExit(createPageTransitionVariants(false).exit, 1);
    const resolvedReduced = resolveExit(createPageTransitionVariants(true).exit, 1);

    expect(resolved).toMatchObject({ pointerEvents: "none" });
    expect(resolvedReduced).toMatchObject({ pointerEvents: "none" });
  });
});
