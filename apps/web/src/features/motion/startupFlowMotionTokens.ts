import type { TargetAndTransition, Variants } from "framer-motion";
import { motionDurations, motionEasings } from "./coreMotionTokens";

type MotionTargets = Record<"initial" | "animate" | "exit", TargetAndTransition>;

const emphasizedAccelerate: [number, number, number, number] = [0.3, 0, 0.8, 0.15];
const PLAYER_ARRIVAL_STAGGER_SECONDS = 0.04;
const EXIT_SECONDS = 0.2;
const READY_SECONDS = 0.46;

const STILL: MotionTargets = { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: {} };

/**
 * A player joining the lobby (`22` §10): the avatar grows in, one after another when several
 * arrive together. Pass the arrival index as the `custom` value.
 */
export function createPlayerArrivalMotion(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return { ...STILL, exit: { opacity: 0, transition: { duration: motionDurations.instant } } };
  }

  return {
    initial: { opacity: 0, scale: 0.8 },
    animate: (index: number = 0) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: index * PLAYER_ARRIVAL_STAGGER_SECONDS,
        duration: motionDurations.screen,
        ease: motionEasings.emphasized,
      },
    }),
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: EXIT_SECONDS, ease: emphasizedAccelerate },
    },
  };
}

/** A setup step becoming done: the badge cross-fades and its tick settles into place. */
export function createStepDoneMotion(reduceMotion: boolean): MotionTargets {
  if (reduceMotion) return STILL;

  return {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: motionDurations.standard, ease: motionEasings.standard },
    },
    exit: {
      opacity: 0,
      transition: { duration: motionDurations.standard, ease: motionEasings.standard },
    },
  };
}

/** Start becoming enabled: one expressive settle, played once per change to ready. */
export function createReadyMotion(reduceMotion: boolean): MotionTargets {
  if (reduceMotion) return STILL;

  return {
    initial: { scale: 0.96 },
    animate: {
      scale: 1,
      transition: { duration: READY_SECONDS, ease: motionEasings.emphasized },
    },
    exit: {},
  };
}

export interface CollapsingHeaderMotion {
  /** Scroll offsets the output ranges map from, for `useTransform(scrollY, input, …)`. */
  input: [number, number];
  heroOpacity: [number, number];
  heroScale: [number, number];
  heroY: [number, number];
  compactTitleOpacity: [number, number];
}

/**
 * The Playlist view header: the cover and title shrink and fade as the list scrolls up while
 * the compact title fades in. Scroll-driven, so it follows the finger instead of playing on a
 * timer; under reduced motion the two headers swap at once halfway through the distance.
 */
export function createCollapsingHeaderMotion(
  reduceMotion: boolean,
  collapseDistance: number,
): CollapsingHeaderMotion {
  if (reduceMotion) {
    const midpoint = collapseDistance / 2;
    return {
      input: [midpoint, midpoint + 1],
      heroOpacity: [1, 0],
      heroScale: [1, 1],
      heroY: [0, 0],
      compactTitleOpacity: [0, 1],
    };
  }

  return {
    input: [0, collapseDistance],
    heroOpacity: [1, 0],
    heroScale: [1, 0.86],
    heroY: [0, -collapseDistance / 2],
    compactTitleOpacity: [0, 1],
  };
}

/** The selection bar rising into the dock when the first row is selected, and leaving. */
export function createSelectionBarMotion(reduceMotion: boolean): MotionTargets {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: motionDurations.instant } },
      exit: { opacity: 0, transition: { duration: motionDurations.instant } },
    };
  }

  return {
    initial: { opacity: 0, y: "100%" },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: motionDurations.standard, ease: motionEasings.emphasized },
    },
    exit: {
      opacity: 0,
      y: "100%",
      transition: { duration: EXIT_SECONDS, ease: emphasizedAccelerate },
    },
  };
}
