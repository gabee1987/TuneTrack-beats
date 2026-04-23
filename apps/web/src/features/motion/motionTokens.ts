import type { TargetAndTransition, Transition, Variants } from "framer-motion";

type CubicBezier = [number, number, number, number];

export type ScreenTransitionDirection = -1 | 0 | 1;

export const motionDurations = {
  instant: 0.01,
  quick: 0.2,
  standard: 0.3,
  screen: 0.52,
  expressive: 0.92,
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

export function createActionDockMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 12 },
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

export function createChallengePanelMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
    };
  }

  return {
    initial: { opacity: 0, scale: 0.98, y: 18 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.985, y: 12 },
  };
}

export function createChallengeCalloutPulseMotion(
  reduceMotion: boolean,
): Pick<TargetAndTransition, "scale" | "y"> {
  if (reduceMotion) {
    return { scale: 1, y: 0 };
  }

  return {
    scale: [1, 1.02, 1],
    y: [0, -1, 0],
  };
}

export function createChallengeCalloutPulseTransition(
  reduceMotion: boolean,
): Transition {
  return {
    duration: reduceMotion ? motionDurations.instant : 1.08,
    ease: [0.35, 0, 0.25, 1],
    repeat: reduceMotion ? 0 : Infinity,
    repeatType: "loop",
  };
}

export function createChallengeCalloutPulseRingMotion(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return {
      opacity: 0.7,
      scale: 1,
    };
  }

  return {
    opacity: [0.35, 0.95, 0.35],
    scale: [1, 1.032, 1],
  };
}

export function createActionButtonExitMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: { opacity: 0, x: 12, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -18, scale: 0.94 },
  };
}

export function createTokenSpendFlyoutInitial(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return {
      opacity: 0,
      rotate: 0,
      scale: 1,
      x: 0,
      y: 0,
    };
  }

  return {
    opacity: 0,
    rotate: 0,
    scale: 0.58,
    x: 0,
    y: 8,
  };
}

export function createLayoutTransition(reduceMotion: boolean): Transition {
  return {
    duration: reduceMotion ? motionDurations.quick : motionDurations.standard,
    ease: motionEasings.standard,
    layout: {
      duration: reduceMotion ? motionDurations.quick : motionDurations.standard,
      ease: motionEasings.standard,
    },
  };
}

export function createTokenSpendFlyoutMotion(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return {
      opacity: [0, 1, 0],
      rotate: 0,
      scale: 1,
      x: 0,
      y: [0, -8, -16],
    };
  }

  return {
    opacity: [0, 1, 1, 0],
    rotate: [0, 0, -8, -16],
    scale: [0.58, 1, 0.92, 0.76],
    x: [0, 0, -8, -18],
    y: [8, -18, -62, -96],
  };
}

export function createTokenSpendFlyoutVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  return {
    initial: createTokenSpendFlyoutInitial(reduceMotion),
    animate: createTokenSpendFlyoutMotion(reduceMotion),
  };
}

export function createPreviewCardReplaceMotion(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 0.82, scale: 0.985, y: 4 },
      animate: { opacity: 1, scale: 1, y: 0 },
    };
  }

  return {
    initial: { opacity: 0.18, scale: 0.92, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
  };
}

export function createPreviewCardReplaceTransition(
  reduceMotion: boolean,
): Transition {
  return {
    duration: reduceMotion ? motionDurations.quick : 0.64,
    ease: [0.18, 0.9, 0.2, 1],
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
    // Material-style shared-axis navigation should be clear and deterministic.
    // Tune `screenSlide` above for a softer or sharper push, without adding bounce.
    ease: motionEasings.screenSlide,
  };
}
