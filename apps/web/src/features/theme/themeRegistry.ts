import type { ThemeId } from "../preferences/uiPreferences";

export interface ThemeTokens {
  "color-bg-app": string;
  "color-bg-app-accent": string;
  "color-surface": string;
  "color-surface-elevated": string;
  "color-surface-soft": string;
  "color-surface-strong": string;
  "color-card": string;
  "color-chip": string;
  "color-overlay": string;
  "color-border-subtle": string;
  "color-text-primary": string;
  "color-text-secondary": string;
  "color-text-muted": string;
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
    "color-surface-soft": "rgba(255, 255, 255, 0.05)",
    "color-surface-strong": "rgba(7, 10, 18, 0.72)",
    "color-card": "rgba(255, 255, 255, 0.07)",
    "color-chip": "rgba(255, 255, 255, 0.07)",
    "color-overlay": "rgba(7, 8, 12, 0.56)",
    "color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "color-text-primary": "#f4f5f8",
    "color-text-secondary": "rgba(244, 245, 248, 0.68)",
    "color-text-muted": "rgba(244, 245, 248, 0.52)",
    "color-accent-primary": "linear-gradient(135deg, #7d6bff 0%, #ff6fa9 100%)",
    "color-accent-danger": "rgba(255, 94, 129, 0.18)",
    "color-accent-success": "rgba(82, 227, 173, 0.18)",
    "shadow-surface": "0 24px 80px rgba(0, 0, 0, 0.4)",
  },
  light: {
    "color-bg-app": "#f5f2ee",
    "color-bg-app-accent": "#eef5fb",
    "color-surface": "rgba(255, 252, 248, 0.88)",
    "color-surface-elevated": "rgba(136, 112, 95, 0.08)",
    "color-surface-soft": "rgba(126, 111, 98, 0.08)",
    "color-surface-strong": "rgba(255, 249, 242, 0.92)",
    "color-card": "rgba(255, 251, 247, 0.94)",
    "color-chip": "rgba(122, 110, 128, 0.10)",
    "color-overlay": "rgba(244, 238, 232, 0.72)",
    "color-border-subtle": "rgba(113, 92, 102, 0.14)",
    "color-text-primary": "#1f2430",
    "color-text-secondary": "rgba(31, 36, 48, 0.68)",
    "color-text-muted": "rgba(31, 36, 48, 0.5)",
    "color-accent-primary": "linear-gradient(135deg, #ff8b5d 0%, #f06fb0 52%, #7b8cff 100%)",
    "color-accent-danger": "rgba(255, 94, 129, 0.14)",
    "color-accent-success": "rgba(82, 227, 173, 0.16)",
    "shadow-surface": "0 24px 70px rgba(90, 79, 74, 0.12)",
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
