import { useIsPresent } from "framer-motion";

/**
 * False once the page this component renders in has started its exit transition (see
 * `PageTransition`). Lets a page stop holding navigation or portaled controls while it leaves.
 */
export function useIsPagePresent(): boolean {
  return useIsPresent();
}
