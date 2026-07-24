import { brandAccent } from "./brandAccent";
import type { ThemeDefinition } from "./themeTypes";

export const lightThemeDefinition: ThemeDefinition = {
  cssVariables: {
    // Soft cool paper — mint/sky wash, not flat white
    "color-bg-app": "#e8eef4",
    "color-bg-app-accent": "#e4f3ec",
    "gradient-app-background":
      "radial-gradient(ellipse 90% 70% at 12% -10%, rgba(29, 185, 84, 0.14), transparent 52%), radial-gradient(ellipse 80% 60% at 92% 8%, rgba(91, 140, 255, 0.16), transparent 48%), linear-gradient(165deg, #e8eef4 0%, #eef6f2 48%, #e6edf6 100%)",

    // Core surfaces
    "color-surface": "rgba(255, 255, 255, 0.72)",
    "color-surface-elevated": "rgba(36, 54, 72, 0.07)",
    "color-surface-elevated-solid": "#f5f8fb",
    "color-surface-interactive": "rgba(36, 54, 72, 0.1)",
    "color-surface-soft": "rgba(36, 54, 72, 0.06)",
    "color-surface-strong": "#ffffff",
    "color-card": "#ffffff",
    "color-chip": "rgba(36, 54, 72, 0.1)",
    "color-overlay": "rgba(232, 238, 244, 0.78)",
    "color-overlay-strong": "rgba(28, 40, 56, 0.42)",
    "color-border-subtle": "rgba(36, 54, 72, 0.16)",
    "color-surface-outline-soft": "rgba(36, 54, 72, 0.08)",
    "color-surface-outline-strong": "rgba(36, 54, 72, 0.14)",
    "color-divider": "rgba(36, 54, 72, 0.1)",

    // Text
    "color-text-primary": "#182230",
    "color-text-secondary": "rgba(24, 34, 48, 0.72)",
    "color-text-muted": "rgba(24, 34, 48, 0.58)",
    "color-text-on-accent": "#182230",
    "color-text-on-dark-surface": "#ffffff",

    // Accent and feedback
    "color-accent-primary": "linear-gradient(135deg, #3d8bfd 0%, #1db954 100%)",
    "color-accent-control": "#2f5fd0",

    // Brand accent (reserved: primary CTAs, active state, play controls).
    "color-accent-brand": brandAccent.light.base,
    "color-accent-brand-hover": brandAccent.light.hover,
    "color-accent-brand-active": brandAccent.light.active,
    "color-on-accent-brand": brandAccent.light.on,
    "color-background-spotify": brandAccent.light.base,
    "color-border-spotify": brandAccent.light.base,
    "color-on-spotify": brandAccent.light.on,

    // Solid semantic state colors
    "color-success": "#0f7a3a",
    "color-danger": "#b91c1c",
    "color-warning": "#9a5b08",
    "color-info": "#1d4ed8",

    "color-accent-danger": "rgba(220, 38, 38, 0.1)",
    "color-accent-success": "rgba(29, 185, 84, 0.14)",
    "color-focus-ring": "rgba(29, 185, 84, 0.55)",
    "color-status-connected-surface": "rgba(29, 185, 84, 0.16)",
    "color-status-connected-text": "#0a6b46",
    "color-status-danger-surface": "rgba(220, 38, 38, 0.1)",
    "color-status-danger-text": "#b91c1c",
    "color-status-danger-border": "rgba(220, 38, 38, 0.34)",
    "color-status-danger-chip-surface": "rgba(220, 38, 38, 0.1)",
    "color-status-danger-chip-text": "#b91c1c",
    "color-badge-strong-background": "rgba(47, 95, 208, 0.14)",
    "color-badge-strong-text": "#1e3f9a",
    "gradient-toggle-checked": "var(--color-accent-brand)",

    // Page decoration
    "gradient-home-shell-background":
      "radial-gradient(circle at top right, rgba(29, 185, 84, 0.12), transparent 30%), radial-gradient(circle at left center, rgba(91, 140, 255, 0.12), transparent 34%), rgba(255, 255, 255, 0.55)",
    "gradient-home-shell-background-mobile":
      "radial-gradient(circle at top right, rgba(29, 185, 84, 0.1), transparent 28%), radial-gradient(circle at left center, rgba(91, 140, 255, 0.1), transparent 32%), transparent",
    "gradient-lobby-shell-background":
      "radial-gradient(circle at top left, rgba(91, 140, 255, 0.12), transparent 26%), radial-gradient(circle at bottom right, rgba(29, 185, 84, 0.1), transparent 24%), rgba(255, 255, 255, 0.55)",
    "gradient-lobby-shell-background-mobile":
      "radial-gradient(circle at top left, rgba(91, 140, 255, 0.09), transparent 26%), radial-gradient(circle at bottom right, rgba(29, 185, 84, 0.08), transparent 24%), transparent",
    "gradient-surface-sheen":
      "linear-gradient(135deg, rgba(255, 255, 255, 0.55), transparent 45%), linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 65%)",
    "gradient-hidden-card-preview-artwork":
      "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.42), transparent 30%), radial-gradient(circle at 80% 0%, rgba(91, 140, 255, 0.28), transparent 34%), linear-gradient(135deg, rgba(91, 140, 255, 0.55) 0%, rgba(29, 185, 84, 0.42) 100%)",
    "gradient-hidden-card-preview-surface":
      "linear-gradient(145deg, #e7eef5 0%, #f2f6f9 55%, #ffffff 100%)",
    "gradient-card-hidden":
      "linear-gradient(145deg, #e7eef5 0%, #f2f6f9 55%, #ffffff 100%)",
    "gradient-card-artwork-scrim":
      "linear-gradient(180deg, rgba(20, 28, 40, 0.12) 0%, rgba(20, 28, 40, 0.28) 42%, rgba(20, 28, 40, 0.78) 100%)",

    // Slider and toggle controls
    "color-slider-track": "rgba(36, 54, 72, 0.14)",
    "color-slider-thumb": brandAccent.light.base,
    "color-slider-thumb-border": "rgba(255, 255, 255, 0.92)",

    // Game UI
    "color-mask-solid": "#e8eef4",
    "color-game-error-text": "var(--color-status-danger-text)",
    "color-game-card-current-outline": "color-mix(in srgb, var(--color-accent-brand) 72%, transparent)",
    "color-game-card-challenge-outline": "color-mix(in srgb, var(--color-warning) 78%, transparent)",
    "color-game-card-failure-outline": "color-mix(in srgb, var(--color-danger) 78%, transparent)",
    "color-game-card-correct-outline": "color-mix(in srgb, var(--color-accent-brand) 88%, transparent)",
    "color-game-card-draggable-outline": "var(--color-accent-brand)",
    "color-game-card-correction-outline": "color-mix(in srgb, var(--color-danger) 82%, transparent)",
    "color-game-preview-scrim": "rgba(232, 238, 244, 0.52)",
    "gradient-game-preview-surface":
      "linear-gradient(160deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.14) 100%), var(--gradient-card-hidden)",
    "gradient-game-preview-correction-surface":
      "linear-gradient(135deg, color-mix(in srgb, var(--color-danger) 18%, transparent) 0%, color-mix(in srgb, var(--color-warning) 12%, transparent) 100%)",
    "color-game-meta-pill-background": "rgba(24, 34, 48, 0.08)",
    "color-game-meta-pill-text": "#182230",
    "color-game-artist-text": "rgba(24, 34, 48, 0.86)",
    "color-game-album-text": "rgba(24, 34, 48, 0.72)",
    "gradient-floating-primary-action": "var(--color-accent-brand)",
    "color-floating-secondary-action-background": "var(--color-surface-interactive)",

    // Shadows
    "shadow-surface": "0 18px 48px rgba(36, 54, 72, 0.1)",
    "shadow-form-card": "0 14px 36px rgba(36, 54, 72, 0.1)",
    "shadow-slider-thumb": "0 4px 12px rgba(36, 54, 72, 0.14)",
    "shadow-slider-thumb-active": "0 6px 16px rgba(36, 54, 72, 0.16)",
    "shadow-game-drop-slot": "var(--shadow-raised)",
    "shadow-game-drop-slot-hover": "var(--shadow-raised)",
    "shadow-game-card-base": "var(--shadow-raised)",
    "shadow-game-card-correct":
      "0 0 0 2px color-mix(in srgb, var(--color-accent-brand) 24%, transparent)",
    "shadow-game-preview-card": "var(--shadow-overlay)",
    "shadow-floating-action": "var(--shadow-raised)",

    "shadow-none": "none",
    "shadow-raised": "0 2px 12px rgba(36, 54, 72, 0.08)",
    "shadow-overlay": "0 10px 32px rgba(36, 54, 72, 0.14)",
    "shadow-dialog": "0 22px 52px rgba(36, 54, 72, 0.18)",
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
