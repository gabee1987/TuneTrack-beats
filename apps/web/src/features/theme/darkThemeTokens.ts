import type { ThemeDefinition } from "./themeTypes";

export const darkThemeDefinition: ThemeDefinition = {
  cssVariables: {
    // App background
    "color-bg-app": "#101116",
    "color-bg-app-accent": "#1a1d28",
    "gradient-app-background":
      "linear-gradient(155deg, #101116 0%, #1a1d28 100%)",

    // Core surfaces
    "color-surface": "rgba(18, 20, 27, 0.92)",
    "color-surface-elevated": "rgba(255, 255, 255, 0.06)",
    "color-surface-soft": "rgba(255, 255, 255, 0.05)",
    "color-surface-strong": "rgba(7, 10, 18, 0.72)",
    "color-card": "rgba(255, 255, 255, 0.07)",
    "color-chip": "rgba(255, 255, 255, 0.07)",
    "color-overlay": "rgba(7, 8, 12, 0.56)",
    "color-overlay-strong": "rgba(6, 9, 16, 0.78)",
    "color-border-subtle": "rgba(255, 255, 255, 0.12)",
    "color-surface-outline-soft": "rgba(255, 255, 255, 0.08)",
    "color-surface-outline-strong": "rgba(255, 255, 255, 0.12)",
    "color-divider": "rgba(255, 255, 255, 0.08)",

    // Text
    "color-text-primary": "#f4f5f8",
    "color-text-secondary": "rgba(244, 245, 248, 0.68)",
    "color-text-muted": "rgba(244, 245, 248, 0.52)",
    "color-text-on-accent": "#ffffff",
    "color-text-on-dark-surface": "#ffffff",

    // Accent and feedback
    "color-accent-primary": "linear-gradient(135deg, #7d6bff 0%, #ff6fa9 100%)",
    "color-accent-control": "#8b7bff",
    "color-accent-danger": "rgba(255, 94, 129, 0.18)",
    "color-accent-success": "rgba(82, 227, 173, 0.18)",
    "color-focus-ring": "rgba(255, 171, 120, 0.95)",
    "color-status-connected-surface": "rgba(82, 227, 173, 0.36)",
    "color-status-connected-text": "#00a359",
    "color-status-danger-surface": "rgba(255, 94, 129, 0.16)",
    "color-status-danger-text": "#ffd9e3",
    "color-status-danger-border": "rgba(255, 41, 88, 0.568)",
    "color-status-danger-chip-surface": "rgba(255, 95, 143, 0.14)",
    "color-status-danger-chip-text": "#ffd7e3",
    "color-badge-strong-background": "rgba(128, 126, 255, 0.38)",
    "color-badge-strong-text": "#ffffff",
    "gradient-toggle-checked":
      "linear-gradient(135deg, #ff8b5d 0%, #7b8cff 100%)",

    // Page decoration
    "gradient-home-shell-background":
      "radial-gradient(circle at top right, rgba(240, 91, 145, 0.18), transparent 28%), radial-gradient(circle at left center, rgba(114, 122, 255, 0.16), transparent 34%), rgba(18, 20, 27, 0.92)",
    "gradient-home-shell-background-mobile":
      "radial-gradient(circle at top right, rgba(240, 91, 145, 0.12), transparent 26%), radial-gradient(circle at left center, rgba(114, 122, 255, 0.11), transparent 32%), transparent",
    "gradient-lobby-shell-background":
      "radial-gradient(circle at top left, rgba(111, 124, 255, 0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 95, 143, 0.12), transparent 22%), rgba(18, 20, 27, 0.92)",
    "gradient-lobby-shell-background-mobile":
      "radial-gradient(circle at top left, rgba(111, 124, 255, 0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 95, 143, 0.08), transparent 22%), transparent",
    "gradient-surface-sheen":
      "linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 45%), linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 65%)",
    "gradient-hidden-card-preview-artwork":
      "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.14), transparent 30%), radial-gradient(circle at 80% 0%, rgba(124, 108, 255, 0.38), transparent 34%), linear-gradient(135deg, rgba(124, 108, 255, 0.8) 0%, rgba(255, 79, 154, 0.72) 100%)",
    "gradient-hidden-card-preview-surface":
      "linear-gradient(135deg, rgba(124, 108, 255, 0.7) 0%, rgba(23, 23, 40, 0.48) 100%)",

    // Slider and toggle controls
    "color-slider-track": "rgba(255, 255, 255, 0.07)",
    "color-slider-thumb": "#ff7c7b",
    "color-slider-thumb-border": "rgba(255, 255, 255, 0.75)",

    // Game UI
    "color-mask-solid": "#000000",
    "color-game-error-text": "#ff8fb3",
    "color-game-card-current-outline": "rgba(124, 108, 255, 0.64)",
    "color-game-card-challenge-outline": "rgba(82, 227, 173, 0.72)",
    "color-game-card-failure-outline": "rgba(255, 94, 129, 0.72)",
    "color-game-card-correct-outline": "rgba(104, 214, 156, 0.92)",
    "color-game-card-draggable-outline": "rgba(129, 112, 255, 1)",
    "color-game-card-correction-outline": "rgba(255, 168, 76, 0.78)",
    "color-game-preview-scrim": "rgba(24, 28, 40, 0.32)",
    "gradient-game-preview-surface":
      "linear-gradient(160deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(26, 30, 44, 0.88)",
    "gradient-game-preview-correction-surface":
      "linear-gradient(135deg, rgba(255, 129, 129, 0.18) 0%, rgba(255, 196, 76, 0.14) 100%)",
    "color-game-meta-pill-background": "rgba(255, 255, 255, 0.16)",
    "color-game-meta-pill-text": "#ffffff",
    "color-game-artist-text": "rgba(255, 255, 255, 0.82)",
    "color-game-album-text": "rgba(255, 255, 255, 0.72)",
    "gradient-floating-primary-action":
      "linear-gradient(135deg, #7c6cff 0%, #ff4f9a 100%)",
    "color-floating-secondary-action-background": "rgba(31, 31, 49, 0.94)",

    // Shadows
    "shadow-surface": "0 24px 80px rgba(0, 0, 0, 0.4)",
    "shadow-form-card": "0 18px 48px rgba(0, 0, 0, 0.24)",
    "shadow-slider-thumb": "0 4px 14px rgba(0, 0, 0, 0.18)",
    "shadow-slider-thumb-active": "0 8px 20px rgba(0, 0, 0, 0.24)",
    "shadow-game-drop-slot":
      "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 18px rgba(0, 0, 0, 0.08)",
    "shadow-game-drop-slot-hover":
      "0 8px 18px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    "shadow-game-card-base": "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    "shadow-game-card-correct":
      "inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 0 0 3px rgba(104, 214, 156, 0.12)",
    "shadow-game-preview-card":
      "0 26px 60px rgba(0, 0, 0, 0.34), 0 10px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.12) inset",
    "shadow-floating-action": "0 14px 34px rgba(0, 0, 0, 0.24)",
  },
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
    "radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.12), transparent 28%)",
};
