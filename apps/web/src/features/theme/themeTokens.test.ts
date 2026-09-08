import { describe, expect, it } from "vitest";
import { brandAccent } from "./brandAccent";
import { darkThemeDefinition } from "./darkThemeTokens";
import { lightThemeDefinition } from "./lightThemeTokens";
import { componentTokenCssVariables } from "./tokens/components";
import {
  motionDurationPrimitives,
  radiusPrimitives,
  spacePrimitives,
  typePrimitives,
  zIndexPrimitives,
} from "./tokens/primitives";

const REQUIRED_NEW_SEMANTIC_TOKENS = [
  "color-surface-interactive",
  "color-surface-elevated-solid",
  "color-accent-brand",
  "color-accent-brand-hover",
  "color-accent-brand-active",
  "color-on-accent-brand",
  "color-background-spotify",
  "color-border-spotify",
  "color-on-spotify",
  "color-success",
  "color-danger",
  "color-warning",
  "color-info",
  "shadow-none",
  "shadow-raised",
  "shadow-overlay",
  "shadow-dialog",
  "gradient-card-hidden",
  "gradient-card-artwork-scrim",
] as const;

describe("theme token contract", () => {
  it("light theme defines exactly the same semantic tokens as dark", () => {
    const darkTokenNames = Object.keys(darkThemeDefinition.cssVariables).sort();
    const lightTokenNames = Object.keys(lightThemeDefinition.cssVariables).sort();

    expect(lightTokenNames).toEqual(darkTokenNames);
  });

  it("resolves every semantic token to a non-empty value in both themes", () => {
    for (const theme of [darkThemeDefinition, lightThemeDefinition]) {
      for (const tokenValue of Object.values(theme.cssVariables)) {
        expect(tokenValue.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("includes the flat design-system semantic tokens in both themes", () => {
    for (const theme of [darkThemeDefinition, lightThemeDefinition]) {
      for (const tokenName of REQUIRED_NEW_SEMANTIC_TOKENS) {
        expect(theme.cssVariables).toHaveProperty(tokenName);
        expect(theme.cssVariables[tokenName].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("wires brand accent tokens from the single brandAccent source", () => {
    expect(darkThemeDefinition.cssVariables["color-accent-brand"]).toBe(brandAccent.dark.base);
    expect(darkThemeDefinition.cssVariables["color-on-accent-brand"]).toBe(brandAccent.dark.on);
    expect(lightThemeDefinition.cssVariables["color-accent-brand"]).toBe(brandAccent.light.base);
    expect(lightThemeDefinition.cssVariables["color-on-accent-brand"]).toBe(brandAccent.light.on);
  });
});

describe("structural and component token foundations", () => {
  it("defines a complete spacing primitive scale", () => {
    expect(Object.keys(spacePrimitives)).toEqual(
      expect.arrayContaining(["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"]),
    );
  });

  it("defines typography primitives for every design-system type style", () => {
    expect(Object.keys(typePrimitives)).toEqual(
      expect.arrayContaining([
        "display",
        "title-lg",
        "title-md",
        "body-lg",
        "body",
        "label",
        "caption",
        "micro",
      ]),
    );
  });

  it("defines radius, motion, and z-index primitives", () => {
    expect(radiusPrimitives.pill).toBe("999px");
    expect(radiusPrimitives.circle).toBe("50%");
    expect(motionDurationPrimitives.standard).toBe("240ms");
    expect(zIndexPrimitives.celebration).toBe("700");
  });

  it("defines component tokens that resolve to CSS variables", () => {
    const componentTokenNames = Object.keys(componentTokenCssVariables);

    expect(componentTokenNames.length).toBeGreaterThan(10);

    for (const tokenValue of Object.values(componentTokenCssVariables)) {
      expect(tokenValue.startsWith("var(--") || tokenValue.endsWith("px")).toBe(true);
    }
  });
});
