import { brandAccent } from "./brandAccent";
import type { ThemeDefinition } from "./themeTypes";

export const lightThemeDefinition: ThemeDefinition = {
  cssVariables: {
    // App background
    "color-bg-app": "#f5f2ee",
    "color-bg-app-accent": "#eef5fb",
    "gradient-app-background": "linear-gradient(155deg, #f5f2ee 0%, #eef5fb 100%)",

    // Core surfaces
    "color-surface": "rgba(255, 252, 248, 0.88)",
    "color-surface-elevated": "rgba(136, 112, 95, 0.08)",
    "color-surface-elevated-solid": "#ffffff",
    "color-surface-interactive": "rgba(90, 72, 60, 0.14)",
    "color-surface-soft": "rgba(90, 72, 60, 0.1)",
    "color-surface-strong": "rgba(255, 249, 242, 0.96)",
    "color-card": "#ffffff",
    "color-chip": "rgba(90, 72, 60, 0.16)",
    "color-overlay": "rgba(244, 238, 232, 0.72)",
    "color-overlay-strong": "rgba(80, 68, 60, 0.42)",
    "color-border-subtle": "rgba(90, 72, 60, 0.22)",
    "color-surface-outline-soft": "rgba(113, 92, 102, 0.08)",
    "color-surface-outline-strong": "rgba(113, 92, 102, 0.14)",
    "color-divider": "rgba(113, 92, 102, 0.12)",

    // Text
    "color-text-primary": "#1f2430",
    "color-text-secondary": "rgba(31, 36, 48, 0.68)",
    "color-text-muted": "rgba(31, 36, 48, 0.5)",
    "color-text-on-accent": "#ffffff",
    "color-text-on-dark-surface": "#ffffff",

    // Accent and feedback
    // Legacy gradient accent — kept until Phase 1+ migrates CTAs to brand accent.
    "color-accent-primary": "linear-gradient(135deg, #ff8b5d 0%, #f06fb0 52%, #7b8cff 100%)",
    "color-accent-control": "#7b8cff",

    // Brand accent (reserved: primary CTAs, active state, play controls).
    // Values live in ./brandAccent.ts — change there to rebrand.
    "color-accent-brand": brandAccent.light.base,
    "color-accent-brand-hover": brandAccent.light.hover,
    "color-accent-brand-active": brandAccent.light.active,
    "color-on-accent-brand": brandAccent.light.on,
    "color-background-spotify": brandAccent.light.base,
    "color-border-spotify": brandAccent.light.base,
    "color-on-spotify": brandAccent.light.on,

    // Solid semantic state colors (design-system layer; additive for Phase 1+)
    "color-success": "#16a34a",
    "color-danger": "#dc2626",
    "color-warning": "#d97706",
    "color-info": "#2563eb",

    "color-accent-danger": "rgba(255, 94, 129, 0.14)",
    "color-accent-success": "rgba(82, 227, 173, 0.16)",
    "color-focus-ring": "rgba(255, 171, 120, 0.95)",
    "color-status-connected-surface": "rgba(82, 227, 173, 0.26)",
    "color-status-connected-text": "#0d8b5a",
    "color-status-danger-surface": "rgba(220, 38, 38, 0.08)",
    "color-status-danger-text": "#b91c1c",
    "color-status-danger-border": "rgba(220, 38, 38, 0.34)",
    "color-status-danger-chip-surface": "rgba(220, 38, 38, 0.08)",
    "color-status-danger-chip-text": "#b91c1c",
    "color-badge-strong-background": "rgba(123, 140, 255, 0.28)",
    "color-badge-strong-text": "#ffffff",
    "gradient-toggle-checked": "linear-gradient(135deg, #ff8b5d 0%, #7b8cff 100%)",

    // Page decoration
    "gradient-home-shell-background":
      "radial-gradient(circle at top right, rgba(240, 91, 145, 0.12), transparent 28%), radial-gradient(circle at left center, rgba(114, 122, 255, 0.1), transparent 34%), rgba(255, 252, 248, 0.88)",
    "gradient-home-shell-background-mobile":
      "radial-gradient(circle at top right, rgba(240, 91, 145, 0.1), transparent 26%), radial-gradient(circle at left center, rgba(114, 122, 255, 0.08), transparent 32%), transparent",
    "gradient-lobby-shell-background":
      "radial-gradient(circle at top left, rgba(111, 124, 255, 0.11), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 95, 143, 0.08), transparent 22%), rgba(255, 252, 248, 0.88)",
    "gradient-lobby-shell-background-mobile":
      "radial-gradient(circle at top left, rgba(111, 124, 255, 0.08), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 95, 143, 0.06), transparent 22%), transparent",
    "gradient-surface-sheen":
      "linear-gradient(135deg, rgba(255, 255, 255, 0.38), transparent 45%), linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 65%)",
    "gradient-hidden-card-preview-artwork":
      "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.36), transparent 30%), radial-gradient(circle at 80% 0%, rgba(123, 140, 255, 0.34), transparent 34%), linear-gradient(135deg, rgba(123, 140, 255, 0.62) 0%, rgba(240, 111, 176, 0.52) 100%)",
    "gradient-hidden-card-preview-surface":
      "linear-gradient(145deg, #ececeb 0%, #f7f7f5 55%, #ffffff 100%)",
    // Neutral hidden-card gradient for the flat design system (Phase 1+ adoption).
    "gradient-card-hidden":
      "linear-gradient(145deg, #ececeb 0%, #f7f7f5 55%, #ffffff 100%)",
    "gradient-card-artwork-scrim":
      "linear-gradient(180deg, rgba(20, 16, 14, 0.12) 0%, rgba(20, 16, 14, 0.28) 42%, rgba(20, 16, 14, 0.78) 100%)",

    // Slider and toggle controls
    "color-slider-track": "rgba(122, 110, 128, 0.18)",
    "color-slider-thumb": "#ff8b5d",
    "color-slider-thumb-border": "rgba(255, 255, 255, 0.9)",

    // Game UI
    "color-mask-solid": "#f4eee8",
    "color-game-error-text": "var(--color-status-danger-text)",
    "color-game-card-current-outline": "color-mix(in srgb, var(--color-accent-brand) 72%, transparent)",
    "color-game-card-challenge-outline": "color-mix(in srgb, var(--color-warning) 78%, transparent)",
    "color-game-card-failure-outline": "color-mix(in srgb, var(--color-danger) 78%, transparent)",
    "color-game-card-correct-outline": "color-mix(in srgb, var(--color-accent-brand) 88%, transparent)",
    "color-game-card-draggable-outline": "var(--color-accent-brand)",
    "color-game-card-correction-outline": "color-mix(in srgb, var(--color-danger) 82%, transparent)",
    "color-game-preview-scrim": "rgba(244, 238, 232, 0.48)",
    "gradient-game-preview-surface":
      "linear-gradient(160deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.12) 100%), var(--gradient-card-hidden)",
    "gradient-game-preview-correction-surface":
      "linear-gradient(135deg, color-mix(in srgb, var(--color-danger) 18%, transparent) 0%, color-mix(in srgb, var(--color-warning) 12%, transparent) 100%)",
    "color-game-meta-pill-background": "rgba(28, 36, 54, 0.1)",
    "color-game-meta-pill-text": "#1f2430",
    "color-game-artist-text": "rgba(31, 36, 48, 0.86)",
    "color-game-album-text": "rgba(31, 36, 48, 0.72)",
    "gradient-floating-primary-action": "var(--color-accent-brand)",
    "color-floating-secondary-action-background": "var(--color-surface-interactive)",

    // Shadows — legacy (keep until component migration)
    "shadow-surface": "0 24px 70px rgba(90, 79, 74, 0.12)",
    "shadow-form-card": "0 18px 48px rgba(90, 79, 74, 0.14)",
    "shadow-slider-thumb": "0 4px 14px rgba(90, 79, 74, 0.16)",
    "shadow-slider-thumb-active": "0 8px 20px rgba(90, 79, 74, 0.18)",
    "shadow-game-drop-slot": "var(--shadow-raised)",
    "shadow-game-drop-slot-hover": "var(--shadow-raised)",
    "shadow-game-card-base": "var(--shadow-raised)",
    "shadow-game-card-correct":
      "0 0 0 2px color-mix(in srgb, var(--color-accent-brand) 24%, transparent)",
    "shadow-game-preview-card": "var(--shadow-overlay)",
    "shadow-floating-action": "var(--shadow-raised)",

    // Elevation scale — flat design system (Phase 1+ adoption)
    "shadow-none": "none",
    "shadow-raised": "0 2px 10px rgba(90, 79, 74, 0.1)",
    "shadow-overlay": "0 8px 28px rgba(90, 79, 74, 0.16)",
    "shadow-dialog": "0 24px 56px rgba(90, 79, 74, 0.22)",
  },
  gameCardGradients: [
    "linear-gradient(142deg, rgba(163, 187, 255, 0.96) 0%, rgba(147, 232, 216, 0.93) 100%)",
    "linear-gradient(227deg, rgba(201, 173, 255, 0.96) 0%, rgba(255, 176, 214, 0.92) 100%)",
    "linear-gradient(116deg, rgba(154, 216, 240, 0.96) 0%, rgba(170, 185, 255, 0.92) 100%)",
    "linear-gradient(201deg, rgba(255, 201, 157, 0.95) 0%, rgba(208, 176, 255, 0.91) 100%)",
    "linear-gradient(132deg, rgba(164, 226, 182, 0.95) 0%, rgba(160, 209, 244, 0.91) 100%)",
    "linear-gradient(238deg, rgba(248, 177, 202, 0.95) 0%, rgba(247, 213, 149, 0.91) 100%)",
    "linear-gradient(154deg, rgba(168, 190, 255, 0.96) 0%, rgba(195, 177, 244, 0.92) 100%)",
    "linear-gradient(213deg, rgba(160, 225, 216, 0.95) 0%, rgba(212, 223, 137, 0.91) 100%)",
  ],
  gameCardPreviewOverlay:
    "linear-gradient(160deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.08) 100%)",
  gameCardPreviewHighlight:
    "radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.24), transparent 28%)",
};
