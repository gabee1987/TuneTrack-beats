import { m } from "framer-motion";
import type { ReactNode } from "react";
import { createReadyMotion } from "./startupFlowMotionTokens";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

interface ReadyTransitionProps {
  children: ReactNode;
  className?: string | undefined;
  isReady: boolean;
}

/**
 * The main action settling into place the moment it becomes available (`createReadyMotion`);
 * an action that is ready on mount does not play it.
 */
export function ReadyTransition({ children, className, isReady }: ReadyTransitionProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <m.div
      animate={isReady ? "animate" : "initial"}
      className={className}
      initial={false}
      variants={createReadyMotion(reduceMotion)}
    >
      {children}
    </m.div>
  );
}
