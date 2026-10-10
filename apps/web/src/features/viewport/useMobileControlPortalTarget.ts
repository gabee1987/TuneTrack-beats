import { useSyncExternalStore } from "react";
import { getUsesMobileControls, subscribeViewport } from "./viewportStore";

/** Where game controls portal to: `document.body` while mobile controls apply, else inline. */
export function useMobileControlPortalTarget(): HTMLElement | null {
  const usesMobileControls = useSyncExternalStore(subscribeViewport, getUsesMobileControls);
  return usesMobileControls ? document.body : null;
}
