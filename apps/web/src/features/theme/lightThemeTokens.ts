import type { ThemeDefinition } from "./themeTypes";

export const lightThemeDefinition: ThemeDefinition = {
  cssVariables: {
    // App background
    "color-bg-app": "#f5f2ee",
    "color-bg-app-accent": "#eef5fb",
    "gradient-app-background":
      "linear-gradient(155deg, #f5f2ee 0%, #eef5fb 100%)",

    // Core surfaces
    "color-surface": "rgba(255, 252, 248, 0.88)",
    "color-surface-elevated": "rgba(136, 112, 95, 0.08)",
    "color-surface-soft": "rgba(126, 111, 98, 0.08)",
    "color-surface-strong": "rgba(255, 249, 242, 0.92)",
    "color-card": "rgba(255, 251, 247, 0.94)",
    "color-chip": "rgba(122, 110, 128, 0.1)",
    "color-overlay": "rgba(244, 238, 232, 0.72)",
    "color-overlay-strong": "rgba(244, 238, 232, 0.72)",
    "color-border-subtle": "rgba(113, 92, 102, 0.14)",
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
    "color-accent-primary":
      "linear-gradient(135deg, #ff8b5d 0%, #f06fb0 52%, #7b8cff 100%)",
    "color-accent-control": "#7b8cff",
    "color-accent-danger": "rgba(255, 94, 129, 0.14)",
    "color-accent-success": "rgba(82, 227, 173, 0.16)",
    "color-focus-ring": "rgba(255, 171, 120, 0.95)",
    "color-status-connected-surface": "rgba(82, 227, 173, 0.26)",
    "color-status-connected-text": "#0d8b5a",
    "color-status-danger-surface": "rgba(255, 94, 129, 0.14)",
    "color-status-danger-text": "#9c3558",
    "color-status-danger-border": "rgba(255, 41, 88, 0.568)",
    "color-status-danger-chip-surface": "rgba(255, 95, 143, 0.12)",
    "color-status-danger-chip-text": "#a23d63",
    "color-badge-strong-background": "rgba(123, 140, 255, 0.28)",
    "color-badge-strong-text": "#ffffff",
    "gradient-toggle-checked":
      "linear-gradient(135deg, #ff8b5d 0%, #7b8cff 100%)",

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
      "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.32), transparent 30%), radial-gradient(circle at 80% 0%, rgba(123, 140, 255, 0.28), transparent 34%), linear-gradient(135deg, rgba(123, 140, 255, 0.58) 0%, rgba(240, 111, 176, 0.5) 100%)",
    "gradient-hidden-card-preview-surface":
      "linear-gradient(135deg, rgba(123, 140, 255, 0.3) 0%, rgba(255, 252, 248, 0.86) 100%)",

    // Slider and toggle controls
    "color-slider-track": "rgba(122, 110, 128, 0.18)",
    "color-slider-thumb": "#ff8b5d",
    "color-slider-thumb-border": "rgba(255, 255, 255, 0.9)",

    // Game UI
    "color-mask-solid": "#000000",
    "color-game-error-text": "#d8487a",
    "color-game-card-current-outline": "rgba(123, 140, 255, 0.64)",
    "color-game-card-challenge-outline": "rgba(37, 162, 119, 0.64)",
    "color-game-card-failure-outline": "rgba(219, 82, 126, 0.64)",
    "color-game-card-correct-outline": "rgba(50, 177, 129, 0.76)",
    "color-game-card-draggable-outline": "rgba(0, 175, 123, 0.94)",
    "color-game-card-correction-outline": "rgba(240, 162, 77, 0.78)",
    "color-game-preview-scrim": "rgba(248, 243, 238, 0.42)",
    "gradient-game-preview-surface":
      "linear-gradient(160deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.08) 100%), rgba(244, 247, 253, 0.88)",
    "gradient-game-preview-correction-surface":
      "linear-gradient(135deg, rgba(255, 152, 152, 0.18) 0%, rgba(255, 204, 120, 0.16) 100%)",
    "color-game-meta-pill-background": "rgba(28, 36, 54, 0.08)",
    "color-game-meta-pill-text": "#1f2430",
    "color-game-artist-text": "rgba(31, 36, 48, 0.82)",
    "color-game-album-text": "rgba(31, 36, 48, 0.72)",
    "gradient-floating-primary-action":
      "linear-gradient(135deg, #7b8cff 0%, #f06fb0 100%)",
    "color-floating-secondary-action-background": "rgba(0, 175, 123, 0.94)",

    // Shadows
    "shadow-surface": "0 24px 70px rgba(90, 79, 74, 0.12)",
    "shadow-form-card": "0 18px 48px rgba(90, 79, 74, 0.14)",
    "shadow-slider-thumb": "0 4px 14px rgba(90, 79, 74, 0.16)",
    "shadow-slider-thumb-active": "0 8px 20px rgba(90, 79, 74, 0.18)",
    "shadow-game-drop-slot":
      "inset 0 1px 0 rgba(255, 255, 255, 0.48), 0 10px 18px rgba(90, 79, 74, 0.08)",
    "shadow-game-drop-slot-hover":
      "0 8px 18px rgba(90, 79, 74, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.52)",
    "shadow-game-card-base": "inset 0 1px 0 rgba(255, 255, 255, 0.38)",
    "shadow-game-card-correct":
      "inset 0 0 0 1px rgba(255, 255, 255, 0.56), 0 0 0 3px rgba(50, 177, 129, 0.12)",
    "shadow-game-preview-card":
      "0 26px 60px rgba(90, 79, 74, 0.18), 0 10px 24px rgba(90, 79, 74, 0.1), 0 0 0 1px rgba(113, 92, 102, 0.12) inset",
    "shadow-floating-action": "0 14px 34px rgba(90, 79, 74, 0.16)",
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
