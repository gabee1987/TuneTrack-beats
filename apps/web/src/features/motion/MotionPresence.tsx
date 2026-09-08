import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface MotionPresenceProps {
  children: ReactNode;
  /**
   * Whether children already present when this boundary first mounts run their enter
   * animation.
   *
   * Defaults to `false`, which suits a boundary that mounts with its content in place
   * (the router's page transitions, a header strip). An overlay that can mount *already
   * open* — because it sits behind `Suspense` and the chunk resolves after the open state
   * is set — must pass `initial` explicitly, or its enter animation is skipped and the
   * panel appears to pop in.
   */
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
  onExitComplete?: () => void;
}

export function MotionPresence({
  children,
  initial = false,
  mode = "wait",
  onExitComplete,
}: MotionPresenceProps) {
  return (
    <AnimatePresence
      initial={initial}
      mode={mode}
      {...(onExitComplete ? { onExitComplete } : {})}
    >
      {children}
    </AnimatePresence>
  );
}
