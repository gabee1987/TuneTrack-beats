/**
 * Primitive design tokens — raw, theme-agnostic scales.
 *
 * Components must not reference these directly. Themes map them into semantic
 * tokens; `globals.css` emits the structural CSS custom properties once at boot.
 * Keep this file and `globals.css` in sync for spacing / type / radii / motion / z.
 */

export const spacePrimitives = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
} as const;

export const spaceAliases = {
  "screen-gutter": spacePrimitives[5],
  "card-padding": spacePrimitives[5],
  "stack-gap": spacePrimitives[4],
} as const;

export const touchTargetSize = "48px" as const;

export const radiusPrimitives = {
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "28px",
  pill: "999px",
  circle: "50%",
  /** Legacy radii kept until component migration finishes. */
  card: "28px",
  panel: "22px",
  input: "18px",
  button: "18px",
} as const;

export const typePrimitives = {
  display: { size: "32px", leading: "36px", weight: "800", tracking: "-0.02em" },
  "title-lg": { size: "24px", leading: "28px", weight: "700", tracking: "-0.01em" },
  "title-md": { size: "20px", leading: "26px", weight: "700", tracking: "-0.01em" },
  "body-lg": { size: "16px", leading: "24px", weight: "500", tracking: "0" },
  body: { size: "14px", leading: "20px", weight: "500", tracking: "0" },
  label: { size: "13px", leading: "16px", weight: "600", tracking: "0.01em" },
  caption: { size: "12px", leading: "16px", weight: "500", tracking: "0.01em" },
  micro: { size: "11px", leading: "14px", weight: "600", tracking: "0.02em" },
} as const;

export const motionDurationPrimitives = {
  quick: "160ms",
  standard: "240ms",
  screen: "320ms",
  expressive: "460ms",
} as const;

export const motionEasePrimitives = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  decelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  accelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
} as const;

export const zIndexPrimitives = {
  base: "0",
  raised: "10",
  sticky: "100",
  nav: "200",
  overlay: "300",
  sheet: "400",
  "sheet-nested": "450",
  dialog: "500",
  "dialog-nested": "550",
  hint: "600",
  toast: "700",
  celebration: "800",
  blocking: "900",
} as const;

/** Neutral / brand ramps used when building semantic theme maps. */
export const colorPrimitives = {
  black: "#0a0a0a",
  nearBlack: "#0e0e10",
  charcoal900: "#181818",
  charcoal800: "#1f1f1f",
  charcoal700: "#2a2a2a",
  white: "#ffffff",
  offWhite: "#f7f7f5",
  green500: "#1ed760",
  green600: "#1db954",
  green700: "#169c46",
  green800: "#128a3e",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
} as const;
