import { m, useMotionValue, useTransform } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createCollapsingHeaderMotion } from "./startupFlowMotionTokens";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

/**
 * The Playlist view's header, driven by the scroller it sits over: the big cover folds away
 * as the list scrolls up and the compact one in the bar takes its place. A passive listener
 * feeds a motion value, so scrolling never re-renders; framer's `useScroll` stopped following
 * a container whose rows are draggable.
 */
export function useCollapsingHeader(container: HTMLElement | null, collapseDistance: number) {
  const reduceMotion = useReducedMotionPreference();
  const scrollY = useMotionValue(0);
  useEffect(() => {
    if (!container) return;
    const follow = () => scrollY.set(container.scrollTop);
    follow();
    container.addEventListener("scroll", follow, { passive: true });
    return () => container.removeEventListener("scroll", follow);
  }, [container, scrollY]);
  const motion = createCollapsingHeaderMotion(reduceMotion, collapseDistance);

  return {
    compactOpacity: useTransform(scrollY, motion.input, motion.compactTitleOpacity),
    heroOpacity: useTransform(scrollY, motion.input, motion.heroOpacity),
    heroScale: useTransform(scrollY, motion.input, motion.heroScale),
    heroY: useTransform(scrollY, motion.input, motion.heroY),
  };
}

export type CollapsingHeaderState = ReturnType<typeof useCollapsingHeader>;

interface CollapsingPartProps {
  children: ReactNode;
  className?: string | undefined;
  collapse: CollapsingHeaderState;
}

/** The big part that folds away. */
export function CollapsingHeaderHero({ children, className, collapse }: CollapsingPartProps) {
  return (
    <m.div
      className={className}
      style={{ opacity: collapse.heroOpacity, scale: collapse.heroScale, y: collapse.heroY }}
    >
      {children}
    </m.div>
  );
}

/** The compact part in the bar that fades in. */
export function CollapsingHeaderCompact({ children, className, collapse }: CollapsingPartProps) {
  return (
    <m.span className={className} style={{ opacity: collapse.compactOpacity }}>
      {children}
    </m.span>
  );
}
