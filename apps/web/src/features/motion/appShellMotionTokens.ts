import type { Transition } from "framer-motion";

export function createMenuTabActivationTransition(reduceMotion: boolean): Transition {
  return reduceMotion
    ? { duration: 0.01 }
    : {
        type: "spring",
        stiffness: 340,
        damping: 32,
        mass: 1,
      };
}

/**
 * Pass as `onUpdate` to keep a fade on the main thread. framer-motion 11 cancels a finished
 * WAAPI opacity animation one frame before it writes the final value, so for one painted
 * frame the element is back at its start opacity: the menu scrim and sheet both went to 0
 * and the game page blinked through the open menu. Any `onUpdate` disables WAAPI.
 */
export function keepFadeOnMainThread(): void {}
