import { darkThemeDefinition } from "./darkThemeTokens";
import { lightThemeDefinition } from "./lightThemeTokens";
import { componentTokenCssVariables } from "./tokens/components";
import type { ThemeDefinition } from "./themeTypes";
import type { ThemeId } from "../preferences/uiPreferences";

export const themeRegistry: Record<ThemeId, ThemeDefinition> = {
  dark: darkThemeDefinition,
  light: lightThemeDefinition,
};

function applyComponentTokens(root: HTMLElement) {
  Object.entries(componentTokenCssVariables).forEach(([tokenName, tokenValue]) => {
    root.style.setProperty(`--${tokenName}`, tokenValue);
  });
}

export function applyTheme(themeId: ThemeId) {
  if (typeof document === "undefined") {
    return;
  }

  const nextTheme = themeRegistry[themeId];
  const root = document.documentElement;

  root.dataset.theme = themeId;

  Object.entries(nextTheme.cssVariables).forEach(([tokenName, tokenValue]) => {
    root.style.setProperty(`--${tokenName}`, tokenValue);
  });

  applyComponentTokens(root);

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const appBackgroundColor = nextTheme.cssVariables["color-bg-app"];

  if (themeColorMeta && appBackgroundColor) {
    themeColorMeta.setAttribute("content", appBackgroundColor);
  }
}
