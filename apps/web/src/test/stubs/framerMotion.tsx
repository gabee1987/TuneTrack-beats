import type * as FramerMotion from "framer-motion";
import type { ReactNode } from "react";

/**
 * Most tests render a component without the app's `MotionFeatureProvider`, and an `m`
 * component without loaded features never leaves its initial state. Tests therefore get the
 * fully featured `motion` components as `m` and a pass-through `LazyMotion`; the production
 * wiring is covered by `MotionFeatureProvider.test.tsx` and the `lazyMotionSites` guard.
 */
export function withEagerMotion(actual: typeof FramerMotion): typeof FramerMotion {
  return {
    ...actual,
    LazyMotion: ({ children }: { children?: ReactNode }) => <>{children}</>,
    m: actual.motion,
  };
}
