import type { ThemeId } from "../preferences/uiPreferences";

export interface ThemeTokens {
  "color-bg-app": string;
  "color-bg-app-accent": string;
  "color-surface": string;
  "color-surface-elevated": string;
  "color-card": string;
  "color-chip": string;
  "color-overlay": string;
  "color-border-subtle": string;
  "color-text-primary": string;
  "color-text-secondary": string;
  "color-accent-primary": string;
  "color-accent-danger": string;
  "color-accent-success": string;
  "shadow-surface": string;
}

export const themeRegistry: Record<ThemeId, ThemeTokens> = {
  dark: {
    "color-bg-app": "linear-gradient(180deg, #141423 0%, #090911 100%)",
    "color-bg-app-accent":
      "radial-gradient(circle at top, rgba(107, 92, 255, 0.35), transparent 35%)",
    "color-surface": "rgba(12, 12, 22, 0.72)",
    "color-surface-elevated": "rgba(255, 255, 255, 0.08)",
    "color-card": "rgba(255, 255, 255, 0.08)",
    "color-chip": "rgba(255, 255, 255, 0.08)",
    "color-overlay": "rgba(9, 9, 17, 0.72)",
    "color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "color-text-primary": "#f7f7fb",
    "color-text-secondary": "rgba(247, 247, 251, 0.72)",
    "color-accent-primary": "linear-gradient(135deg, #7c6cff 0%, #ff4f9a 100%)",
    "color-accent-danger": "rgba(255, 94, 129, 0.18)",
    "color-accent-success": "rgba(82, 227, 173, 0.18)",
    "shadow-surface": "0 24px 80px rgba(0, 0, 0, 0.4)",
  },
  light: {
    "color-bg-app": "linear-gradient(180deg, #f7f7fb 0%, #e8ebf6 100%)",
    "color-bg-app-accent":
      "radial-gradient(circle at top, rgba(124, 108, 255, 0.18), transparent 35%)",
    "color-surface": "rgba(255, 255, 255, 0.82)",
    "color-surface-elevated": "rgba(124, 108, 255, 0.08)",
    "color-card": "rgba(255, 255, 255, 0.92)",
    "color-chip": "rgba(124, 108, 255, 0.08)",
    "color-overlay": "rgba(255, 255, 255, 0.82)",
    "color-border-subtle": "rgba(26, 26, 46, 0.12)",
    "color-text-primary": "#171728",
    "color-text-secondary": "rgba(23, 23, 40, 0.68)",
    "color-accent-primary": "linear-gradient(135deg, #6f60ff 0%, #ff5ca8 100%)",
    "color-accent-danger": "rgba(255, 94, 129, 0.14)",
    "color-accent-success": "rgba(82, 227, 173, 0.16)",
    "shadow-surface": "0 24px 80px rgba(49, 61, 101, 0.16)",
  },
};

export function applyTheme(themeId: ThemeId) {
  if (typeof document === "undefined") {
    return;
  }

  const nextTheme = themeRegistry[themeId];
  const root = document.documentElement;

  root.dataset.theme = themeId;

  Object.entries(nextTheme).forEach(([tokenName, tokenValue]) => {
    root.style.setProperty(`--${tokenName}`, tokenValue);
  });
}
