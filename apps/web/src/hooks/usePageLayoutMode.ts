import { useSyncExternalStore } from "react";
import type { PageLayoutMode } from "../app/layout/pageLayoutMode";
import { getLayoutMode, subscribeViewport } from "../features/viewport/viewportStore";

export function usePageLayoutMode(): PageLayoutMode {
  return useSyncExternalStore(subscribeViewport, getLayoutMode);
}
