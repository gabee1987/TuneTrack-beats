import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

const loadDomAnimation = () =>
  import("./domAnimationFeatures").then((module) => module.domAnimation);

/**
 * Keeps the framer-motion animation runtime off the eager path (05 D1): `m` components render
 * their initial state at once and start animating when the features arrive. `strict` turns an
 * accidental `motion.*` component, which would pull the whole runtime back in, into an error.
 */
export function MotionFeatureProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      {children}
    </LazyMotion>
  );
}
