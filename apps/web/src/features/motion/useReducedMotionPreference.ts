import { useReducedMotion } from "framer-motion";

/**
 * Single source of truth for motion reduction across the app. Wraps the
 * framer-motion media-query hook and normalizes its `null` (pre-resolution)
 * result to `false`, so every component resolves reduced-motion identically.
 *
 * Extend motion-reduction policy here (e.g. a user-facing motion toggle) instead
 * of adding scattered `useReducedMotion()` checks in components.
 */
export function useReducedMotionPreference(): boolean {
  return useReducedMotion() ?? false;
}
