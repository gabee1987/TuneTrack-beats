import type { TargetAndTransition, Transition } from "framer-motion";
import { motionDurations, motionEasings } from "./coreMotionTokens";

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

function createTokenSpendFlyoutInitial(
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

function createTokenSpendFlyoutMotion(
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

export function createTimelineCelebrationVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 0, rotate: 0, scale: 0.95, y: 12 },
      animate: {
        opacity: [0, 1, 1, 0],
        rotate: 0,
        scale: [0.95, 1, 1, 0.96],
        y: [12, 0, -4, -12],
      },
      exit: { opacity: 0, rotate: 0, scale: 0.96, y: -14 },
    };
  }

  return {
    initial: { opacity: 0, rotate: -10, scale: 0.68, y: 26 },
    animate: {
      opacity: [0, 1, 1, 0],
      rotate: [-10, 5, -3, 7],
      scale: [0.68, 1.12, 1.02, 0.9],
      y: [26, -10, -2, -24],
    },
    exit: { opacity: 0, rotate: 8, scale: 0.9, y: -28 },
  };
}

export function createTimelineCelebrationTransition(
  reduceMotion: boolean,
): Transition {
  return {
    duration: reduceMotion ? motionDurations.quick : 1.6,
    ease: "easeInOut",
    times: [0, 0.24, 0.72, 1],
  };
}

export function createTimelineFlyAnimationVariants(
  reduceMotion: boolean,
  deltaX: number,
  deltaY: number,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, scale: 1, x: 0, y: 0 },
      animate: { opacity: 0, scale: 0.82, x: deltaX, y: deltaY },
    };
  }

  return {
    initial: { opacity: 1, scale: 1, x: 0, y: 0 },
    animate: { opacity: 0, scale: 0.2, x: deltaX, y: deltaY },
  };
}

export function createTimelineFlyAnimationTransition(
  reduceMotion: boolean,
): Transition {
  return {
    duration: reduceMotion ? motionDurations.quick : motionDurations.expressive,
    ease: motionEasings.emphasized,
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
