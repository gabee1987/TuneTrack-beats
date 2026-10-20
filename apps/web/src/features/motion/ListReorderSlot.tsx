import { m } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

// A new sort slides each row to its place instead of jumping (plan 11 Phase 1 watches it).
const REORDER_SPRING = { type: "spring", stiffness: 420, damping: 42, mass: 0.9 } as const;
const INSTANT = { duration: 0 } as const;

interface ListReorderSlotProps {
  children: ReactNode;
  className?: string | undefined;
  /** The row's place in its virtualised list. */
  offset: number;
}

/** One row of a virtualised list, placed by `transform` so a reorder animates. */
export function ListReorderSlot({ children, className, offset }: ListReorderSlotProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <m.div
      animate={{ y: offset }}
      className={className}
      initial={false}
      transition={reduceMotion ? INSTANT : REORDER_SPRING}
    >
      {children}
    </m.div>
  );
}
