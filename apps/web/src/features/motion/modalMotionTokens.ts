import type { TargetAndTransition, Variants } from "framer-motion";
import { createFadeMotion } from "./coreMotionTokens";

export interface ModalSheetMotionTargets {
  animate: { opacity: number; x: number; y: number };
  exit: { opacity: number; x: number; y: number };
  initial: { opacity: number; x: number; y: number };
}

export function createModalOverlayMotionTargets(
  reduceMotion: boolean,
): Record<"initial" | "animate" | "exit", TargetAndTransition> {
  return createFadeMotion(reduceMotion);
}

export function createModalSheetMotionTargets(
  reduceMotion: boolean,
): ModalSheetMotionTargets & Variants {
  if (reduceMotion) {
    return {
      initial: { opacity: 0, x: 0, y: 0 },
      animate: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 0, x: 0, y: 0 },
    };
  }

  return {
    initial: { opacity: 0, x: 56, y: 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 56, y: 0 },
  };
}
