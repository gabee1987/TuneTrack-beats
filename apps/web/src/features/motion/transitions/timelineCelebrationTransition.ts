import type { TargetAndTransition, Transition } from "framer-motion";
import { motionDurations, motionEasings } from "../coreMotionTokens";

export const timelineCelebrationTransitionContract = {
  flyAnimationCleanupMs: 850,
  toastVisibilityMs: 1800,
} as const;

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
