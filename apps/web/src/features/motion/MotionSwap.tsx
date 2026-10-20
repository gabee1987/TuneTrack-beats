import { m, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";

type MotionTargets = Record<"initial" | "animate", TargetAndTransition>;

interface MotionSwapProps {
  children: ReactNode;
  className?: string | undefined;
  motion: MotionTargets;
  /** A new key replaces the view in the same commit and plays the new view's entry. */
  swapKey: string;
}

/**
 * One view replacing another in the same place, such as the tabs of a sheet. The old view
 * leaves at once instead of fading out first: an exit before the entry leaves the place empty
 * for a moment, and everything below it jumps up and back.
 */
export function MotionSwap({ children, className, motion, swapKey }: MotionSwapProps) {
  return (
    <m.div
      animate="animate"
      className={className}
      initial="initial"
      key={swapKey}
      variants={motion}
    >
      {children}
    </m.div>
  );
}
