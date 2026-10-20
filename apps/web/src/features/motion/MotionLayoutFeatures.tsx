import { domMax, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Adds framer's layout and drag features for the subtrees that use `layout`, `layoutId` or
 * `drag` (Game and Lobby routes, the app-shell menu sheet). Loaded synchronously so those
 * lazy chunks carry `domMax` and nothing waits on a second request. Not exported from the
 * barrel, so the eager path never reaches it.
 */
export function MotionLayoutFeatures({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
