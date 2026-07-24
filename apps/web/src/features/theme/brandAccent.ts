/**
 * Single source of truth for the reserved brand accent.
 *
 * The brand accent is the one saturated colour the UI reserves for primary
 * intent: primary CTAs, active navigation/selection, and play controls. Every
 * other surface stays neutral, and content (album artwork) supplies the rest of
 * the colour — the Spotify-style "one accent" discipline.
 *
 * To rebrand the whole app, change ONLY the values in this file. Both themes
 * read their brand tokens from here.
 *
 *   base   — default fill
 *   hover  — pointer/hover state
 *   active — pressed state
 *   on     — text/icon colour placed on top of the accent fill
 */
export const brandAccent = {
  dark: {
    base: "#1ed760",
    hover: "#1fdf64",
    active: "#169c46",
    on: "#0a0a0a",
  },
  light: {
    base: "#1db954",
    hover: "#1ed760",
    active: "#128a3e",
    on: "#0a0a0a",
  },
} as const;
