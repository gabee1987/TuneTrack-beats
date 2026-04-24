import type { TargetAndTransition } from "framer-motion";
import { motionDurations, motionEasings } from "../coreMotionTokens";

export const previewCardReplaceTransitionContract = {
  enter: {
    opacityDurationSeconds: 0.24,
    spring: {
      damping: 18,
      mass: 0.74,
      stiffness: 250,
    },
  },
  enterInitial: {
    opacity: 0,
    scale: 0,
  },
  exit: {
    opacity: 0,
    scale: 0,
    spring: {
      damping: 30,
      mass: 0.82,
      stiffness: 340,
    },
  },
} as const;

export function createPreviewCardReplaceExitMotion(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return {
      opacity: previewCardReplaceTransitionContract.exit.opacity,
      scale: previewCardReplaceTransitionContract.exit.scale,
      transition: {
        duration: motionDurations.quick,
        ease: motionEasings.standard,
      },
    };
  }

  return {
    opacity: previewCardReplaceTransitionContract.exit.opacity,
    scale: previewCardReplaceTransitionContract.exit.scale,
    transition: {
      type: "spring",
      ...previewCardReplaceTransitionContract.exit.spring,
    },
  };
}

export function createPreviewCardReplaceEnterInitial(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return {
      opacity: previewCardReplaceTransitionContract.enterInitial.opacity,
      scale: previewCardReplaceTransitionContract.enterInitial.scale,
    };
  }

  return {
    opacity: previewCardReplaceTransitionContract.enterInitial.opacity,
    scale: previewCardReplaceTransitionContract.enterInitial.scale,
  };
}

export function createPreviewCardReplaceEnterMotion(
  reduceMotion: boolean,
): TargetAndTransition {
  if (reduceMotion) {
    return {
      opacity: 1,
      scale: 1,
      transition: {
        duration: motionDurations.quick,
        ease: motionEasings.standard,
      },
    };
  }

  return {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: {
        duration: previewCardReplaceTransitionContract.enter.opacityDurationSeconds,
        ease: [0.2, 0.8, 0.2, 1],
      },
      scale: {
        type: "spring",
        ...previewCardReplaceTransitionContract.enter.spring,
      },
    },
  };
}
