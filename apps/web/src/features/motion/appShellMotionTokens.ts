import type { Transition } from "framer-motion";
import { motionDurations, motionEasings } from "./coreMotionTokens";

/**
 * One transition for the whole menu, shared by the scrim and the sheet so the two layers
 * always start and finish together. They are separate elements precisely so their opacities
 * do not multiply, which makes it easy to drift them apart by accident.
 *
 * Emphasised rather than standard easing: it front-loads the travel and settles, which is
 * what makes a panel of this size read as snappy instead of merely short.
 */
export function createAppShellMenuTransition(reduceMotion: boolean): Transition {
  return {
    duration: reduceMotion ? motionDurations.instant : motionDurations.standard,
    ease: motionEasings.emphasized,
  };
}

/**
 * A short slide combined with a fade, which reads faster than travelling the sheet's whole
 * width. Both depend on the scrim being a *sibling* of the sheet rather than its parent:
 * opacity multiplies down the tree, so a scrim wrapping a fading sheet showed the page
 * through the panel on the way in and emptied it a third of the way through the way out.
 *
 * Pair with `createAppShellMenuTransition`, which both layers share.
 */
export function createAppShellMenuSheetMotionTargets(reduceMotion: boolean): {
  // Inline rather than a named interface: framer-motion's target types require an implicit
  // index signature for custom properties, which an interface does not get.
  animate: { opacity: number; x: number };
  exit: { opacity: number; x: number };
  initial: { opacity: number; x: number };
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 0, x: 0 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 0 },
    };
  }

  return {
    initial: { opacity: 0, x: 64 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 64 },
  };
}

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
