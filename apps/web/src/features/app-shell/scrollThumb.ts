/** The smallest thumb still easy to see on a very long list. */
export const MIN_THUMB_PX = 32;

export interface ScrollMetrics {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
  /** Where the scrolling box sits in the viewport. */
  top: number;
}

export interface ScrollThumb {
  height: number;
  top: number;
}

/**
 * Where the thumb of a vertically scrolling box goes, in viewport pixels; `null` when the box
 * has nothing to scroll (a horizontal ruler, a list that fits).
 */
export function getScrollThumb({
  clientHeight,
  scrollHeight,
  scrollTop,
  top,
}: ScrollMetrics): ScrollThumb | null {
  const scrollRange = scrollHeight - clientHeight;
  if (scrollRange < 1 || clientHeight <= 0) return null;

  const height = Math.max(MIN_THUMB_PX, (clientHeight * clientHeight) / scrollHeight);
  const progress = Math.min(Math.max(scrollTop / scrollRange, 0), 1);
  return { height, top: top + progress * (clientHeight - height) };
}
