import type { TargetAndTransition } from "framer-motion";
import { motionDurations, motionEasings } from "./coreMotionTokens";

type MotionTargets = Record<"initial" | "animate" | "exit", TargetAndTransition>;

const emphasizedAccelerate: [number, number, number, number] = [0.3, 0, 0.8, 0.15];

/**
 * The one entrance for every panel that comes in from the right: settings, Music Setup, the
 * playlist editor and the song editor. The panel stays opaque and travels its full width, so
 * nothing behind it can show through; only the scrim fades. A fading panel let the screen
 * underneath flicker through it on every open (owner report 2026-10-08).
 */
export function createSideSheetMotion(reduceMotion: boolean): MotionTargets {
  if (reduceMotion) {
    return { initial: { x: 0 }, animate: { x: 0 }, exit: { x: 0 } };
  }

  return {
    initial: { x: "100%" },
    animate: {
      x: 0,
      transition: { duration: motionDurations.screen, ease: motionEasings.emphasized },
    },
    exit: {
      x: "100%",
      transition: { duration: motionDurations.standard, ease: emphasizedAccelerate },
    },
  };
}

/** The scrim under a side sheet, timed with it. */
export function createSideSheetScrimMotion(reduceMotion: boolean): MotionTargets {
  const enter = reduceMotion ? motionDurations.instant : motionDurations.screen;
  const exit = reduceMotion ? motionDurations.instant : motionDurations.standard;

  return {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: enter, ease: motionEasings.standard } },
    exit: { opacity: 0, transition: { duration: exit, ease: motionEasings.standard } },
  };
}
