import type { TargetAndTransition, Transition } from "framer-motion";
import { motionDurations, motionEasings } from "../coreMotionTokens";

export const timelineCelebrationTransitionContract = {
  flyAnimationCleanupMs: 850,
  toastVisibilityMs: 1800,
  // Correct-placement celebration timings are split by role so the shell,
  // fill surface, and content can be tuned without coupling everything
  // into one opaque keyframe.
  correctPlacementHeroDurationSeconds: 0.88,
  correctPlacementFillDurationSeconds: 0.88,
  correctPlacementContentDurationSeconds: 0.88,
  correctPlacementShellContentDurationSeconds: 0.22,
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

export function createCorrectPlacementCardVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 1, scale: 1 },
    };
  }

  return {
    // Tunable: this is the preview-card shell motion.
    // The shell is already on screen. It owns the full spring path so once the
    // fill reaches the shell, both move together automatically.
    initial: {
      opacity: 1,
      scale: 1,
      filter: "brightness(1) saturate(1)",
    },
    animate: {
      opacity: [1, 1, 1, 1, 1],
      scale: [1, 1.072, 1.136, 0.934, 1],
      filter: [
        "brightness(1) saturate(1)",
        "brightness(1.04) saturate(1.02)",
        "brightness(1.14) saturate(1.1)",
        "brightness(1.01) saturate(1.01)",
        "brightness(1) saturate(1)",
      ],
    },
  };
}

export function createCorrectPlacementCardTransition(
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    duration: timelineCelebrationTransitionContract.correctPlacementHeroDurationSeconds,
    ease: [0.22, 0.9, 0.24, 1],
    times: [0, 0.2, 0.5, 0.82, 1],
  };
}

export function createCorrectPlacementFillVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 1, scale: 1 },
    };
  }

  return {
    // Tunable: this is the interior fill bloom from the center.
    // It only grows into the shell. After that, the parent shell transform
    // handles the shared overshoot/undershoot/settle path.
    initial: {
      opacity: 0,
      scale: 0,
      filter: "brightness(1.06) saturate(1.02)",
    },
    animate: {
      opacity: [0, 0.34, 0.96, 1, 1],
      scale: [0, 0.34, 1, 1, 1],
      filter: [
        "brightness(1.06) saturate(1.02)",
        "brightness(1.12) saturate(1.06)",
        "brightness(1.16) saturate(1.1)",
        "brightness(1.02) saturate(1.02)",
        "brightness(1) saturate(1)",
      ],
    },
  };
}

export function createCorrectPlacementFillTransition(
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    duration: timelineCelebrationTransitionContract.correctPlacementFillDurationSeconds,
    ease: [0.22, 0.9, 0.24, 1],
    // The fill reaches the shell at the same clock position where the shell
    // reaches peak scale, then it simply rides the shell transform.
    times: [0, 0.2, 0.5, 0.82, 1],
    delay: 0,
  };
}

export function createCorrectPlacementContentVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 1, scale: 1 },
    };
  }

  return {
    // Tunable: content follows the fill with a slight lag so it feels like it
    // belongs to the filling card rather than the outline shell.
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: [0, 0.18, 0.9, 1, 1],
      scale: [0, 0.28, 1, 1, 1],
    },
  };
}

export function createCorrectPlacementContentTransition(
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    duration: timelineCelebrationTransitionContract.correctPlacementContentDurationSeconds,
    ease: [0.22, 0.9, 0.24, 1],
    times: [0, 0.22, 0.5, 0.82, 1],
    delay: 0.02,
  };
}

export function createCorrectPlacementShellContentVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 0, scale: 1 },
    };
  }

  return {
    // Tunable: this is the old preview-card content fading away while the
    // filled card grows from the center. Keep this short so the shell itself
    // remains visible, but the text does not pop out abruptly.
    initial: { opacity: 1, scale: 1 },
    animate: {
      opacity: [1, 0.82, 0.18, 0],
      scale: [1, 1.01, 0.985, 0.97],
    },
  };
}

export function createCorrectPlacementShellContentTransition(
  reduceMotion: boolean,
): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    duration:
      timelineCelebrationTransitionContract.correctPlacementShellContentDurationSeconds,
    ease: [0.2, 0.82, 0.24, 1],
    times: [0, 0.34, 0.74, 1],
    delay: 0,
  };
}
