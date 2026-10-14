import { m, PresenceContext, useIsPresent } from "framer-motion";
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
  // A leaving page is still drawn while it slides out, but it is no longer the page: it takes
  // no taps and leaves the accessibility tree, so nothing finds two copies of a control.
  const isLeaving = !useIsPresent();
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
      aria-hidden={isLeaving || undefined}
      custom={direction}
      exit="exit"
      initial="initial"
      style={{
        inset: 0,
        height: "max-content",
        minHeight: "var(--app-height)",
        position: "absolute",
        ...(isLeaving ? { pointerEvents: "none" as const } : {}),
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
