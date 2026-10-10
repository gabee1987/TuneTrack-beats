import { m, PresenceContext } from "framer-motion";
import { useReducedMotionPreference } from "./useReducedMotionPreference";
import { type ReactNode, useContext, useMemo } from "react";
import {
  type ScreenTransitionDirection,
  createPageTransitionVariants,
  createScreenTransition,
} from "./coreMotionTokens";

interface PageTransitionProps {
  children: ReactNode;
  direction: ScreenTransitionDirection;
}

const keepNoExitOpen = () => () => {};

export function PageTransition({ children, direction }: PageTransitionProps) {
  const reduceMotion = useReducedMotionPreference();
  const pagePresence = useContext(PresenceContext);
  // Only this wrapper's exit decides when the old page leaves. Every motion element inside
  // would otherwise hold it open, and one mounted after the exit began never reports done, so
  // the page stayed mounted for good (B18). The page still sees `isPresent` turn false.
  const contentPresence = useMemo(() => {
    if (!pagePresence) return null;
    const { onExitComplete: _pageExitComplete, ...presence } = pagePresence;
    return { ...presence, register: keepNoExitOpen };
  }, [pagePresence]);

  return (
    <m.div
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
      <PresenceContext.Provider value={contentPresence}>{children}</PresenceContext.Provider>
    </m.div>
  );
}
