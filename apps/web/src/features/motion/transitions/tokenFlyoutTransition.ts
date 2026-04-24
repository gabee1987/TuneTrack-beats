import type { TargetAndTransition, Transition } from "framer-motion";
import { motionDurations, motionEasings } from "../coreMotionTokens";

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

export function createMenuTokenAdjustFlyoutTransition(
  reduceMotion: boolean,
): Transition {
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

export function createMenuTokenAdjustFlyoutPopTransition(
  reduceMotion: boolean,
): Transition {
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
