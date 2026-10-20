import { describe, expect, it } from "vitest";
import { createMenuTabActivationTransition } from "./appShellMotionTokens";

describe("createMenuTabActivationTransition", () => {
  it("springs between tabs", () => {
    expect(createMenuTabActivationTransition(false)).toMatchObject({ type: "spring" });
  });

  it("collapses to an instant when reduced motion is requested", () => {
    expect(createMenuTabActivationTransition(true)).toEqual({ duration: 0.01 });
  });
});
