import type { TargetAndTransition, Transition, Variants } from "framer-motion";

type CubicBezier = [number, number, number, number];

export type ScreenTransitionDirection = -1 | 0 | 1;

export const motionDurations = {
  instant: 0.01,
  quick: 0.16,
  standard: 0.24,
  screen: 0.32,
  expressive: 0.4,
} as const;

export const motionEasings = {
  standard: [0.2, 0, 0, 1] as CubicBezier,
  screenSlide: [0.2, 0, 0, 1] as CubicBezier,
  emphasized: [0.05, 0.7, 0.1, 1] as CubicBezier,
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
      x: `${direction * 100}%`,
      zIndex: direction === -1 ? 1 : 2,
    }),
    animate: {
      x: "0%",
      zIndex: 2,
    },
    exit: (direction: ScreenTransitionDirection = 1) => ({
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

export function createDialogCardMotion(
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
    initial: { opacity: 0, scale: 0.96, y: 16 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 10 },
  };
}

export function createDisclosurePanelMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, height: "auto" },
      animate: { opacity: 1, height: "auto" },
      exit: { opacity: 1, height: "auto" },
    };
  }

  return {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
  };
}

export function createToastSlideMotion(
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
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: motionEasings.emphasized },
    },
    exit: {
      opacity: 0,
      y: -14,
      scale: 0.95,
      transition: { duration: 0.2, ease: motionEasings.standard },
    },
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

export function createExpressiveTransition(reduceMotion: boolean): Transition {
  return {
    duration: reduceMotion ? motionDurations.instant : motionDurations.expressive,
    ease: motionEasings.emphasized,
  };
}

export function createScreenTransition(reduceMotion: boolean): Transition {
  return {
    duration: reduceMotion ? motionDurations.instant : motionDurations.screen,
    ease: motionEasings.screenSlide,
  };
}
