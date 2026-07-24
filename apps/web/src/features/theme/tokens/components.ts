/**
 * Component tokens — theme-agnostic CSS custom properties that resolve to
 * semantic tokens. Injected once at boot (and on every applyTheme call so a
 * late boot path still gets them). Components may reference these; themes
 * never redefine them.
 */

export const componentTokenCssVariables = {
  // Button
  "button-primary-bg": "var(--color-accent-brand)",
  "button-primary-bg-hover": "var(--color-accent-brand-hover)",
  "button-primary-bg-active": "var(--color-accent-brand-active)",
  "button-primary-fg": "var(--color-on-accent-brand)",
  "button-radius": "var(--radius-pill)",
  "button-min-height": "var(--size-touch-target)",

  // Card
  "card-bg": "var(--color-surface)",
  "card-bg-elevated": "var(--color-surface-elevated)",
  "card-radius": "var(--radius-md)",
  "card-padding": "var(--space-card-padding)",
  "card-shadow": "var(--shadow-none)",

  // Chip
  "chip-bg": "var(--color-chip)",
  "chip-fg": "var(--color-text-secondary)",
  "chip-radius": "var(--radius-pill)",
  "chip-min-height": "var(--size-touch-target)",

  // Bottom sheet
  "sheet-bg": "var(--color-surface-elevated-solid)",
  "sheet-radius-top": "var(--radius-lg)",
  "sheet-shadow": "var(--shadow-overlay)",
  "sheet-handle": "var(--color-border-subtle)",

  // Dialog
  "dialog-bg": "var(--color-surface-elevated-solid)",
  "dialog-radius": "var(--radius-lg)",
  "dialog-shadow": "var(--shadow-dialog)",

  // Input
  "input-bg": "var(--color-surface-elevated)",
  "input-fg": "var(--color-text-primary)",
  "input-border": "var(--color-border-subtle)",
  "input-radius": "var(--radius-sm)",
  "input-min-height": "var(--size-touch-target)",

  // List row
  "list-row-min-height": "56px",
  "list-row-gap": "var(--space-3)",
  "list-row-padding-inline": "var(--space-4)",
} as const;

export type ComponentTokenName = keyof typeof componentTokenCssVariables;
