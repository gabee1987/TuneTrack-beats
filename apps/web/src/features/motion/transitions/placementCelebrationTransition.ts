import type { Transition, Variants } from "framer-motion";
import { motionDurations, motionEasings } from "../coreMotionTokens";

export type PlacementCelebrationTone = "success" | "failure";

/**
 * The placement result popup: a badge that lands, a mark drawn into it, rings, a glow and
 * particles around it, then the message word by word. Transform, opacity and SVG path length
 * only. The popup stays for `timelineCelebrationTransitionContract.toastVisibilityMs`; every
 * entry here finishes inside that window.
 */
export const placementCelebrationContract = {
  messageDelaySeconds: 0.32,
  messageWordStaggerSeconds: 0.06,
  particleDurationSeconds: 1.35,
  ringDelaysSeconds: [0.04, 0.2],
} as const;

/** Final particle offsets from the badge centre; fixed so every celebration looks hand-timed. */
export const placementConfettiParticles = [
  { x: -132, y: -96, rotate: -220, delay: 0.02, hue: "brand", shape: "strip" },
  { x: -84, y: -138, rotate: 160, delay: 0.06, hue: "gold", shape: "dot" },
  { x: -26, y: -150, rotate: -140, delay: 0.1, hue: "mint", shape: "strip" },
  { x: 34, y: -146, rotate: 200, delay: 0.04, hue: "pink", shape: "star" },
  { x: 92, y: -128, rotate: -180, delay: 0.08, hue: "brand", shape: "strip" },
  { x: 138, y: -82, rotate: 240, delay: 0.03, hue: "gold", shape: "star" },
  { x: 156, y: -18, rotate: -160, delay: 0.11, hue: "mint", shape: "dot" },
  { x: 140, y: 52, rotate: 180, delay: 0.07, hue: "pink", shape: "strip" },
  { x: 96, y: 104, rotate: -220, delay: 0.12, hue: "brand", shape: "dot" },
  { x: 30, y: 128, rotate: 150, delay: 0.05, hue: "gold", shape: "strip" },
  { x: -38, y: 122, rotate: -200, delay: 0.09, hue: "mint", shape: "star" },
  { x: -102, y: 92, rotate: 210, delay: 0.02, hue: "pink", shape: "dot" },
  { x: -146, y: 36, rotate: -170, delay: 0.1, hue: "brand", shape: "strip" },
  { x: -158, y: -34, rotate: 190, delay: 0.06, hue: "gold", shape: "star" },
  { x: -60, y: -60, rotate: -120, delay: 0.14, hue: "mint", shape: "dot" },
  { x: 64, y: -54, rotate: 130, delay: 0.13, hue: "pink", shape: "dot" },
] as const;

/** Shards fall away under "gravity" from the shaking badge. */
export const placementFailureShards = [
  { x: -96, y: 118, rotate: -160, delay: 0.36 },
  { x: -58, y: 150, rotate: 120, delay: 0.42 },
  { x: -18, y: 132, rotate: -90, delay: 0.38 },
  { x: 24, y: 158, rotate: 140, delay: 0.44 },
  { x: 66, y: 126, rotate: -130, delay: 0.37 },
  { x: 104, y: 146, rotate: 170, delay: 0.41 },
  { x: -124, y: 72, rotate: 100, delay: 0.4 },
  { x: 128, y: 84, rotate: -110, delay: 0.39 },
] as const;

type ParticleTarget = { x: number; y: number; rotate: number; delay: number };

export function createPlacementCelebrationStageVariants(reduceMotion: boolean): Variants {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.92, y: -24, transition: { duration: motionDurations.screen } },
  };
}

export function createPlacementCelebrationBadgeVariants(
  reduceMotion: boolean,
  tone: PlacementCelebrationTone,
): Variants {
  if (reduceMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 } };
  }

  if (tone === "failure") {
    return {
      initial: { opacity: 0, scale: 0.6, y: -48, x: 0 },
      animate: {
        opacity: [0, 1, 1, 1],
        scale: [0.6, 1.12, 0.96, 1],
        y: [-48, 6, 0, 0],
        x: [0, 0, 0, 0],
        transition: { duration: 0.42, ease: motionEasings.emphasized, times: [0, 0.55, 0.8, 1] },
      },
      shake: {
        x: [0, -12, 11, -8, 6, -3, 0],
        rotate: [0, -6, 5, -3, 2, 0, 0],
        transition: { delay: 0.36, duration: 0.55, ease: "easeInOut" },
      },
    };
  }

  return {
    initial: { opacity: 0, scale: 0, rotate: -30 },
    animate: {
      opacity: 1,
      scale: [0, 1.22, 0.92, 1.04, 1],
      rotate: [-30, 10, -4, 0, 0],
      transition: { duration: 0.75, ease: "easeOut", times: [0, 0.38, 0.62, 0.82, 1] },
    },
  };
}

export function createPlacementCelebrationMarkTransition(
  reduceMotion: boolean,
  strokeIndex: number,
): Transition {
  if (reduceMotion) {
    return { duration: motionDurations.instant };
  }

  return { delay: 0.22 + strokeIndex * 0.14, duration: 0.34, ease: motionEasings.standard };
}

export function createPlacementCelebrationGlowVariants(): Variants {
  return {
    initial: { opacity: 0, scale: 0.35 },
    animate: {
      opacity: [0, 0.95, 0.6, 0],
      scale: [0.35, 1.1, 1.3, 1.5],
      transition: { duration: 1.6, ease: "easeOut", times: [0, 0.2, 0.55, 1] },
    },
  };
}

export function createPlacementCelebrationRingVariants(delay: number): Variants {
  return {
    initial: { opacity: 0, scale: 0.3 },
    animate: {
      opacity: [0, 0.9, 0],
      scale: [0.3, 1.6, 2.6],
      transition: { delay, duration: 0.95, ease: motionEasings.emphasized, times: [0, 0.35, 1] },
    },
  };
}

/** Bursts out in an arc, then drifts down as it fades. */
export function createPlacementConfettiVariants(particle: ParticleTarget): Variants {
  return {
    initial: { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.4 },
    animate: {
      opacity: [0, 1, 1, 0],
      x: [0, particle.x * 0.78, particle.x],
      y: [0, particle.y * 0.78 - 18, particle.y + 46],
      rotate: [0, particle.rotate * 0.6, particle.rotate],
      scale: [0.4, 1.1, 0.8],
      transition: {
        delay: particle.delay,
        duration: placementCelebrationContract.particleDurationSeconds,
        ease: [0.12, 0.8, 0.3, 1],
        times: [0, 0.35, 1],
      },
    },
  };
}

/** Pops off the badge, then falls with an accelerating ease. */
export function createPlacementShardVariants(shard: ParticleTarget): Variants {
  return {
    initial: { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 },
    animate: {
      opacity: [0, 1, 1, 0],
      x: [0, shard.x * 0.5, shard.x],
      y: [0, -22, shard.y],
      rotate: [0, shard.rotate * 0.4, shard.rotate],
      scale: [0.6, 1, 0.7],
      transition: {
        delay: shard.delay,
        duration: 1.05,
        ease: [0.5, 0, 0.75, 0.4],
        times: [0, 0.25, 1],
      },
    },
  };
}

export function createPlacementMessageVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 } };
  }

  return {
    initial: { opacity: 0, y: 28, scale: 0.86 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: placementCelebrationContract.messageDelaySeconds,
        type: "spring",
        stiffness: 360,
        damping: 24,
        staggerChildren: placementCelebrationContract.messageWordStaggerSeconds,
        delayChildren: placementCelebrationContract.messageDelaySeconds + 0.06,
      },
    },
  };
}

export function createPlacementMessageWordVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return { initial: { opacity: 1 }, animate: { opacity: 1 } };
  }

  return {
    initial: { opacity: 0, y: 14, rotate: -4 },
    animate: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { type: "spring", stiffness: 420, damping: 22 },
    },
  };
}
