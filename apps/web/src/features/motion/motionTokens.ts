import type { TargetAndTransition, Transition, Variants } from "framer-motion";

type CubicBezier = [number, number, number, number];

export type ScreenTransitionDirection = -1 | 0 | 1;

export const motionDurations = {
  instant: 0.01,
  quick: 0.16,
  standard: 0.24,
  screen: 0.46,
  expressive: 0.82,
} as const;

export const motionEasings = {
  standard: [0.22, 1, 0.36, 1] as CubicBezier,
  screenSlide: [0.3, 0, 0.2, 1] as CubicBezier,
  emphasized: [0.18, 0.84, 0.24, 1] as CubicBezier,
} as const;

export function createPageTransitionVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, x: "0%" },
      animate: { opacity: 1, x: "0%" },
      exit: { opacity: 1, x: "0%" },
    };
  }

  return {
    initial: (direction: ScreenTransitionDirection = 1) => ({
      // Push transition: the incoming screen starts just outside the viewport.
      // Use `100%` for a full push. Smaller values create an overlapping slide.
      x: `${direction * 100}%`,
      // Forward navigation works well with the incoming page above. On browser
      // back, keep the incoming page below so the current page does not appear
      // to slide underneath it while moving right.
      zIndex: direction === -1 ? 1 : 2,
    }),
    animate: {
      x: "0%",
      zIndex: 2,
    },
    exit: (direction: ScreenTransitionDirection = 1) => ({
      // The outgoing screen moves the opposite way, so the new screen visually
      // pushes it away instead of fading over it.
      x: `${direction * -100}%`,
      zIndex: direction === -1 ? 2 : 1,
    }),
  };
}

export function createBottomSheetMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 28 },
  };
}

export function createFadeMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  return reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
}

export function createStandardTransition(reduceMotion: boolean): Transition {
  return {
    duration: reduceMotion ? motionDurations.instant : motionDurations.standard,
    ease: motionEasings.standard,
  };
}

export function createScreenTransition(reduceMotion: boolean): Transition {
  return {
    duration: reduceMotion ? motionDurations.instant : motionDurations.screen,
    // Material-style shared-axis navigation should be clear and deterministic.
    // Tune `screenSlide` above for a softer or sharper push, without adding bounce.
    ease: motionEasings.screenSlide,
  };
}
