import { prefersReducedMotion } from "../../features/motion/prefersReducedMotion";

/**
 * Optional light haptic feedback for primary press interactions.
 * No-ops when Vibration API is unavailable or the user prefers reduced motion.
 */
export function triggerPressHaptic(pattern: number | number[] = 10): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (prefersReducedMotion()) {
    return;
  }

  if (typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(pattern);
}
