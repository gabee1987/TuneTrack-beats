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

function createTokenSpendFlyoutInitial(reduceMotion: boolean): TargetAndTransition {
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

function createTokenSpendFlyoutMotion(reduceMotion: boolean): TargetAndTransition {
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

export function createMenuTokenAdjustFlyoutVariants(
  reduceMotion: boolean,
  direction: "add" | "remove",
): Record<"initial" | "animate", TargetAndTransition> {
  const travelTarget = direction === "add" ? -52 : 52;

  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: {
        opacity: [1, 0],
        y: travelTarget,
      },
    };
  }

  return {
    initial: {
      opacity: 1,
      y: 0,
    },
    animate: {
      opacity: [1, 1, 0],
      y: travelTarget,
    },
  };
}

export function createMenuTokenAdjustFlyoutTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    opacity: {
      duration: 0.6,
      ease: [0.18, 0.8, 0.32, 1],
      times: [0, 0.74, 1],
      delay: 0.2,
    },
    y: {
      type: "spring",
      stiffness: 280,
      damping: 24,
      mass: 0.56,
      delay: 0.22,
    },
  };
}

export function createMenuTokenAdjustFlyoutPopVariants(
  reduceMotion: boolean,
): Record<"initial" | "animate", TargetAndTransition> {
  if (reduceMotion) {
    return {
      initial: { opacity: 0, scale: 1, z: 0 },
      animate: { opacity: [0, 1], scale: [1, 1] },
    };
  }

  return {
    initial: {
      opacity: 0,
      scale: 1,
      z: -12,
      rotateX: 12,
      transformPerspective: 880,
    },
    animate: {
      opacity: [0, 1, 1],
      scale: [1, 1.2, 1],
      z: [-12, 240, 0],
      rotateX: [12, -14, 0],
      transformPerspective: 880,
    },
  };
}

export function createMenuTokenAdjustFlyoutPopTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    opacity: {
      duration: 0.34,
      ease: [0.16, 0.9, 0.3, 1],
      times: [0, 0.45, 1],
    },
    scale: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      times: [0, 0.48, 1],
      type: "tween",
    },
    z: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      times: [0, 0.48, 1],
      type: "tween",
    },
    rotateX: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      times: [0, 0.48, 1],
      type: "tween",
    },
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

export function createTimelineCelebrationTransition(reduceMotion: boolean): Transition {
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

export function createTimelineFlyAnimationTransition(reduceMotion: boolean): Transition {
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
      initial: { opacity: 0.94, rotateY: 0, scale: 1 },
      animate: { opacity: 1, rotateY: 0, scale: 1 },
    };
  }

  return {
    initial: {
      opacity: 1,
      rotateY: 0,
      scale: 1,
      transformPerspective: 980,
      transformOrigin: "50% 50%",
    },
    animate: {
      opacity: 1,
      rotateY: [0, 89.5, 89.5, 0],
      scale: [1, 1, 1.018, 1],
      transformPerspective: 980,
      transformOrigin: "50% 50%",
    },
  };
}

export function createPreviewCardReplaceTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) {
    return {
      duration: motionDurations.quick,
      ease: motionEasings.standard,
    };
  }

  return {
    rotateY: {
      duration: 0.56,
      ease: [0.24, 0.84, 0.26, 1],
      times: [0, 0.44, 0.58, 1],
    },
    scale: {
      type: "spring",
      stiffness: 420,
      damping: 28,
      mass: 0.62,
      delay: 0.34,
    },
    opacity: {
      duration: 0.18,
      ease: "linear",
    },
  };
}
