import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface MotionPresenceProps {
  children: ReactNode;
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}

export function MotionPresence({
  children,
  initial = false,
  mode = "wait",
}: MotionPresenceProps) {
  return (
    <AnimatePresence initial={initial} mode={mode}>
      {children}
    </AnimatePresence>
  );
}
