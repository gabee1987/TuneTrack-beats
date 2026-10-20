import { m, useIsPresent, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";
import { MotionPresence } from "./MotionPresence";

type MotionTargets = Record<"initial" | "animate" | "exit", TargetAndTransition>;

interface MotionRevealProps {
  children: ReactNode;
  className?: string | undefined;
  isShown: boolean;
  motion: MotionTargets;
}

/**
 * Mounts its content with an entry and unmounts it after an exit, for a primitive that
 * appears and disappears in place (the selection bar). A leaving copy stops taking input at
 * once, so a tap during the exit never reaches a control that is already gone.
 */
export function MotionReveal({ children, className, isShown, motion }: MotionRevealProps) {
  return (
    <MotionPresence initial={false} mode="sync">
      {isShown ? (
        <RevealFrame className={className} key="reveal" motion={motion}>
          {children}
        </RevealFrame>
      ) : null}
    </MotionPresence>
  );
}

function RevealFrame({ children, className, motion }: Omit<MotionRevealProps, "isShown">) {
  const isPresent = useIsPresent();

  return (
    <m.div
      animate="animate"
      className={className}
      exit="exit"
      initial="initial"
      style={isPresent ? {} : { pointerEvents: "none" }}
      variants={motion}
    >
      {children}
    </m.div>
  );
}
