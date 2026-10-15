import { m } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createMeasuredDisclosureMotion } from "./lobbyMotionTokens";
import { createStandardTransition } from "./coreMotionTokens";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

interface MeasuredDisclosureProps {
  children: ReactNode;
  className?: string | undefined;
  id?: string | undefined;
  isOpen: boolean;
}

/**
 * Content that slides open to its measured height and closed again (owner decision 19: the token
 * settings slide stays). Closed content stays mounted for the exit and is `inert`, so it can be
 * neither tapped nor reached with Tab; once closed it is hidden as well.
 */
export function MeasuredDisclosure({ children, className, id, isOpen }: MeasuredDisclosureProps) {
  const reduceMotion = useReducedMotionPreference();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    const updateMeasuredHeight = () => {
      setContentHeight(contentElement.scrollHeight);
    };

    updateMeasuredHeight();
    const resizeObserver = new ResizeObserver(updateMeasuredHeight);
    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Closed content is hidden only once the slide has ended, and shown again as soon as it opens.
  const [isSettledClosed, setIsSettledClosed] = useState(!isOpen);
  if (isOpen && isSettledClosed) setIsSettledClosed(false);

  // React 18 does not pass `inert` through as a prop.
  useLayoutEffect(() => {
    frameRef.current?.toggleAttribute("inert", !isOpen);
  }, [isOpen]);

  return (
    <m.div
      animate={createMeasuredDisclosureMotion(reduceMotion, isOpen, contentHeight)}
      id={id}
      initial={false}
      ref={frameRef}
      onAnimationComplete={() => {
        if (!isOpen) setIsSettledClosed(true);
      }}
      style={{
        overflow: "hidden",
        pointerEvents: isOpen ? "auto" : "none",
        // Closed content also leaves the accessibility tree.
        visibility: isSettledClosed ? "hidden" : "visible",
      }}
      transition={createStandardTransition(reduceMotion)}
    >
      <div className={className} ref={contentRef}>
        {children}
      </div>
    </m.div>
  );
}
