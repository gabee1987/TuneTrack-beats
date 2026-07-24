/**
 * Sync reduced-motion check for non-React call sites (services, utilities).
 * Components should prefer `useReducedMotionPreference` so they re-render on change.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
