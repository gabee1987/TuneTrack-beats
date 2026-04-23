import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  type ScreenTransitionDirection,
  createPageTransitionVariants,
  createScreenTransition,
} from "./coreMotionTokens";

interface PageTransitionProps {
  children: ReactNode;
  direction: ScreenTransitionDirection;
}

export function PageTransition({ children, direction }: PageTransitionProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      animate="animate"
      custom={direction}
      exit="exit"
      initial="initial"
      style={{
        inset: 0,
        height: "max-content",
        minHeight: "var(--app-height)",
        position: "absolute",
        width: "100%",
        willChange: "transform",
        zIndex: 2,
      }}
      transition={createScreenTransition(reduceMotion)}
      variants={createPageTransitionVariants(reduceMotion)}
    >
      {children}
    </motion.div>
  );
}
