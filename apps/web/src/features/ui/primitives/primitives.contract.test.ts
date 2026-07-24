import { describe, expect, it } from "vitest";
import { componentTokenCssVariables } from "../../theme/tokens/components";

describe("design-system primitives contract", () => {
  it("exposes button, card, sheet, and input component tokens", () => {
    expect(componentTokenCssVariables["button-primary-bg"]).toContain("color-accent-brand");
    expect(componentTokenCssVariables["card-radius"]).toContain("radius-md");
    expect(componentTokenCssVariables["sheet-shadow"]).toContain("shadow-overlay");
    expect(componentTokenCssVariables["input-min-height"]).toContain("size-touch-target");
  });
});
