export type PageLayoutMode = "desktop" | "mobile";

export const MOBILE_LAYOUT_COMPACT_WIDTH = 720;
export const MOBILE_LAYOUT_MAX_WIDTH = 960;
export const MOBILE_LAYOUT_MAX_HEIGHT = 520;

interface ResolvePageLayoutModeInput {
  isCoarsePointer: boolean;
  viewportHeight: number;
  viewportWidth: number;
}

export function resolvePageLayoutMode({
  isCoarsePointer,
  viewportHeight,
  viewportWidth,
}: ResolvePageLayoutModeInput): PageLayoutMode {
  if (viewportWidth <= MOBILE_LAYOUT_COMPACT_WIDTH) {
    return "mobile";
  }

  if (
    isCoarsePointer &&
    (viewportWidth <= MOBILE_LAYOUT_MAX_WIDTH ||
      viewportHeight <= MOBILE_LAYOUT_MAX_HEIGHT)
  ) {
    return "mobile";
  }

  return "desktop";
}
