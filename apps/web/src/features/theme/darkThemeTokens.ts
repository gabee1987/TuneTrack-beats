import { brandAccent } from "./brandAccent";
import type { ThemeDefinition } from "./themeTypes";

const darkThemeCssVariables = {
  // App background
  "color-bg-app": "#101116",
  "gradient-app-background": "linear-gradient(155deg, #101116 0%, #1a1d28 100%)",

  // Core surfaces
  "color-surface": "rgba(18, 20, 27, 0.92)",
  "color-surface-elevated": "rgba(255, 255, 255, 0.06)",
  "color-surface-elevated-solid": "#1f1f1f",
  "color-surface-interactive": "rgba(255, 255, 255, 0.1)",
  "color-surface-soft": "rgba(255, 255, 255, 0.05)",
  "color-surface-strong": "rgba(7, 10, 18, 0.72)",
  "color-chip": "rgba(255, 255, 255, 0.07)",
  "color-overlay": "rgba(7, 8, 12, 0.56)",
  "color-overlay-strong": "rgba(6, 9, 16, 0.78)",
  "color-border-subtle": "rgba(255, 255, 255, 0.12)",
  "color-surface-outline-soft": "rgba(255, 255, 255, 0.08)",
  "color-divider": "rgba(255, 255, 255, 0.08)",

  // Text
  "color-text-primary": "#f4f5f8",
  "color-text-secondary": "rgba(244, 245, 248, 0.68)",
  "color-text-muted": "rgba(244, 245, 248, 0.52)",

  // Accent and feedback
  // Legacy gradient accent — kept until Phase 1+ migrates CTAs to brand accent.
  "color-accent-primary": "linear-gradient(135deg, #7d6bff 0%, #ff6fa9 100%)",
  "color-accent-control": "#8b7bff",

  // Brand accent (reserved: primary CTAs, active state, play controls).
  // Values live in ./brandAccent.ts — change there to rebrand.
  "color-accent-brand": brandAccent.dark.base,
  "color-accent-brand-hover": brandAccent.dark.hover,
  "color-accent-brand-active": brandAccent.dark.active,
  "color-on-accent-brand": brandAccent.dark.on,
  "color-background-spotify": brandAccent.dark.base,
  "color-border-spotify": brandAccent.dark.base,
  "color-on-spotify": brandAccent.dark.on,

  // Solid semantic state colors (design-system layer; additive for Phase 1+)
  "color-success": "#22c55e",
  "color-danger": "#ef4444",
  "color-warning": "#f59e0b",
  "color-info": "#3b82f6",

  "color-accent-danger": "rgba(255, 94, 129, 0.18)",
  "color-focus-ring": "rgba(255, 171, 120, 0.95)",
  "color-status-connected-surface": "rgba(82, 227, 173, 0.36)",
  "color-status-connected-text": "#00a359",
  "color-status-danger-surface": "rgba(239, 68, 68, 0.12)",
  "color-status-danger-text": "#fecaca",
  "color-status-danger-border": "rgba(248, 113, 113, 0.55)",
  "color-status-danger-chip-surface": "rgba(239, 68, 68, 0.1)",
  "color-status-danger-chip-text": "#fecaca",
  "color-badge-strong-background": "rgba(128, 126, 255, 0.38)",
  "color-badge-strong-text": "#ffffff",
  "gradient-toggle-checked": "linear-gradient(135deg, #ff8b5d 0%, #7b8cff 100%)",

  // Page decoration
  "gradient-home-shell-background":
    "radial-gradient(circle at top right, rgba(240, 91, 145, 0.18), transparent 28%), radial-gradient(circle at left center, rgba(114, 122, 255, 0.16), transparent 34%), rgba(18, 20, 27, 0.92)",
  "gradient-home-shell-background-mobile":
    "radial-gradient(circle at top right, rgba(240, 91, 145, 0.12), transparent 26%), radial-gradient(circle at left center, rgba(114, 122, 255, 0.11), transparent 32%), transparent",
  "gradient-lobby-shell-background":
    "radial-gradient(circle at top left, rgba(111, 124, 255, 0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 95, 143, 0.12), transparent 22%), rgba(18, 20, 27, 0.92)",
  "gradient-lobby-shell-background-mobile":
    "radial-gradient(circle at top left, rgba(111, 124, 255, 0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 95, 143, 0.08), transparent 22%), transparent",
  "gradient-hidden-card-preview-artwork":
    "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.18), transparent 30%), radial-gradient(circle at 80% 0%, rgba(124, 108, 255, 0.42), transparent 34%), linear-gradient(135deg, rgba(124, 108, 255, 0.85) 0%, rgba(255, 79, 154, 0.72) 100%)",
  // Neutral hidden-card gradient for the flat design system (Phase 1+ adoption).
  "gradient-card-hidden":
    "linear-gradient(145deg, #2a2a2a 0%, #181818 55%, #121212 100%)",
  "gradient-card-artwork-scrim":
    "linear-gradient(180deg, rgba(10, 10, 10, 0.18) 0%, rgba(10, 10, 10, 0.34) 42%, rgba(10, 10, 10, 0.82) 100%)",

  // Game UI
  "color-mask-solid": "#000000",
  "color-game-error-text": "var(--color-status-danger-text)",
  "color-game-card-current-outline": "color-mix(in srgb, var(--color-accent-brand) 72%, transparent)",
  "color-game-card-challenge-outline": "color-mix(in srgb, var(--color-warning) 78%, transparent)",
  "color-game-card-failure-outline": "color-mix(in srgb, var(--color-danger) 78%, transparent)",
  "color-game-card-correct-outline": "color-mix(in srgb, var(--color-accent-brand) 88%, transparent)",
  "color-game-card-draggable-outline": "var(--color-accent-brand)",
  "color-game-card-correction-outline": "color-mix(in srgb, var(--color-danger) 82%, transparent)",
  "color-game-preview-scrim": "rgba(18, 18, 18, 0.42)",
  "gradient-game-preview-correction-surface":
    "linear-gradient(135deg, color-mix(in srgb, var(--color-danger) 22%, transparent) 0%, color-mix(in srgb, var(--color-warning) 14%, transparent) 100%)",
  "color-game-meta-pill-background": "rgba(255, 255, 255, 0.14)",
  "color-game-meta-pill-text": "#ffffff",
  "color-game-artist-text": "rgba(255, 255, 255, 0.86)",
  "color-game-album-text": "rgba(255, 255, 255, 0.72)",

  // Shadows — legacy (keep until component migration)
  "shadow-surface": "0 24px 80px rgba(0, 0, 0, 0.4)",
  "shadow-form-card": "0 18px 48px rgba(0, 0, 0, 0.24)",
  "shadow-slider-thumb": "0 4px 14px rgba(0, 0, 0, 0.18)",
  "shadow-slider-thumb-active": "0 8px 20px rgba(0, 0, 0, 0.24)",
  "shadow-game-card-base": "var(--shadow-raised)",
  "shadow-game-card-correct":
    "0 0 0 2px color-mix(in srgb, var(--color-accent-brand) 28%, transparent)",
  "shadow-game-preview-card": "var(--shadow-overlay)",

  // Elevation scale — flat design system (Phase 1+ adoption)
  "shadow-none": "none",
  "shadow-raised": "0 2px 8px rgba(0, 0, 0, 0.24)",
  "shadow-overlay": "0 8px 32px rgba(0, 0, 0, 0.32)",
  "shadow-dialog": "0 24px 64px rgba(0, 0, 0, 0.5)",
} satisfies Record<string, string>;

export type SemanticColorTokenName = keyof typeof darkThemeCssVariables;
export type SemanticColorTokens = Record<SemanticColorTokenName, string>;

export const darkThemeDefinition: ThemeDefinition = {
  cssVariables: darkThemeCssVariables,
  gameCardGradients: [
    "linear-gradient(142deg, rgba(88, 105, 245, 0.92) 0%, rgba(62, 199, 192, 0.78) 100%)",
    "linear-gradient(227deg, rgba(130, 92, 235, 0.92) 0%, rgba(234, 99, 171, 0.76) 100%)",
    "linear-gradient(116deg, rgba(58, 160, 196, 0.9) 0%, rgba(99, 110, 240, 0.78) 100%)",
    "linear-gradient(201deg, rgba(240, 142, 88, 0.88) 0%, rgba(176, 103, 227, 0.72) 100%)",
    "linear-gradient(132deg, rgba(76, 177, 128, 0.88) 0%, rgba(70, 138, 216, 0.74) 100%)",
    "linear-gradient(238deg, rgba(226, 101, 152, 0.84) 0%, rgba(235, 166, 88, 0.72) 100%)",
    "linear-gradient(154deg, rgba(92, 126, 247, 0.9) 0%, rgba(126, 96, 214, 0.76) 100%)",
    "linear-gradient(213deg, rgba(67, 171, 161, 0.86) 0%, rgba(167, 186, 90, 0.72) 100%)",
  ],
  gameCardPreviewOverlay:
    "linear-gradient(160deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)",
  gameCardPreviewHighlight:
    "radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.16), transparent 28%)",
};
