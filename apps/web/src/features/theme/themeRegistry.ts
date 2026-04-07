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
    "color-bg-app": "#101116",
    "color-bg-app-accent": "#1a1d28",
    "color-surface": "rgba(18, 20, 27, 0.92)",
    "color-surface-elevated": "rgba(255, 255, 255, 0.06)",
    "color-card": "rgba(255, 255, 255, 0.07)",
    "color-chip": "rgba(255, 255, 255, 0.07)",
    "color-overlay": "rgba(7, 8, 12, 0.56)",
    "color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "color-text-primary": "#f4f5f8",
    "color-text-secondary": "rgba(244, 245, 248, 0.68)",
    "color-accent-primary": "linear-gradient(135deg, #7d6bff 0%, #ff6fa9 100%)",
    "color-accent-danger": "rgba(255, 94, 129, 0.18)",
    "color-accent-success": "rgba(82, 227, 173, 0.18)",
    "shadow-surface": "0 24px 80px rgba(0, 0, 0, 0.4)",
  },
  light: {
    "color-bg-app": "#edf0f5",
    "color-bg-app-accent": "#f4eef8",
    "color-surface": "rgba(250, 251, 255, 0.86)",
    "color-surface-elevated": "rgba(90, 103, 140, 0.07)",
    "color-card": "rgba(255, 255, 255, 0.82)",
    "color-chip": "rgba(90, 103, 140, 0.08)",
    "color-overlay": "rgba(234, 239, 246, 0.58)",
    "color-border-subtle": "rgba(61, 73, 104, 0.12)",
    "color-text-primary": "#1c2436",
    "color-text-secondary": "rgba(28, 36, 54, 0.62)",
    "color-accent-primary": "linear-gradient(135deg, #6a77ef 0%, #ef7ca6 100%)",
    "color-accent-danger": "rgba(255, 94, 129, 0.14)",
    "color-accent-success": "rgba(82, 227, 173, 0.16)",
    "shadow-surface": "0 24px 80px rgba(46, 59, 95, 0.12)",
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
