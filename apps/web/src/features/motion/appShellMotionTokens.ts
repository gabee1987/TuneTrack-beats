import type { Transition } from "framer-motion";
import { createModalSheetMotionTargets } from "./modalMotionTokens";

export function createAppShellMenuSheetOffset(
  reduceMotion: boolean,
  isMobileSheet: boolean,
): { x: number; y: number } {
  void isMobileSheet;

  if (reduceMotion) {
    return { x: 0, y: 0 };
  }

  return { x: 56, y: 0 };
}

export function createAppShellMenuSheetMotionTargets(
  reduceMotion: boolean,
  isMobileSheet: boolean,
): {
  animate: { opacity: number; x: number; y: number };
  exit: { opacity: number; x: number; y: number };
  initial: { opacity: number; x: number; y: number };
} {
  void isMobileSheet;
  return createModalSheetMotionTargets(reduceMotion);
}

export function createMenuTabActivationTransition(reduceMotion: boolean): Transition {
  return reduceMotion
    ? { duration: 0.01 }
    : {
        type: "spring",
        stiffness: 340,
        damping: 32,
        mass: 1,
      };
}
