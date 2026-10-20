export const ACTION_DOCK_SELECTOR = "[data-action-dock='true']";

/** Edge zone depth as a share of the visible timeline, clamped to a thumb-sized band. */
const EDGE_ZONE_RATIO = 0.16;
const EDGE_ZONE_MIN_PX = 56;
const EDGE_ZONE_MAX_PX = 132;
/** Entering the zone already scrolls; the speed grows with depth so a slot stays aimable. */
const EDGE_SCROLL_MIN_PX_PER_SECOND = 160;
const EDGE_SCROLL_MAX_PX_PER_SECOND = 1_000;

export interface TimelineEdgeScrollBounds {
  axis: "x" | "y";
  end: number;
  start: number;
}

/**
 * Read once at drag start. On a vertical grid the bottom edge is the top of the action dock
 * when the dock covers the timeline, so scrolling starts where the cards disappear behind it.
 */
export function measureTimelineEdgeScrollBounds(
  container: HTMLElement,
): TimelineEdgeScrollBounds | null {
  const containerRect = container.getBoundingClientRect();

  if (container.scrollHeight > container.clientHeight) {
    const dockTop = document.querySelector(ACTION_DOCK_SELECTOR)?.getBoundingClientRect().top;
    const coversTimeline =
      dockTop !== undefined && dockTop > containerRect.top && dockTop < containerRect.bottom;
    return {
      axis: "y",
      end: coversTimeline ? dockTop : containerRect.bottom,
      start: containerRect.top,
    };
  }

  if (container.scrollWidth > container.clientWidth) {
    return { axis: "x", end: containerRect.right, start: containerRect.left };
  }

  return null;
}

/** Signed px/s: negative scrolls towards the start, positive towards the end, 0 outside the zones. */
export function getTimelineEdgeScrollVelocity(
  bounds: TimelineEdgeScrollBounds,
  pointer: { x: number; y: number },
): number {
  const position = bounds.axis === "y" ? pointer.y : pointer.x;
  const zone = Math.min(
    EDGE_ZONE_MAX_PX,
    Math.max(EDGE_ZONE_MIN_PX, (bounds.end - bounds.start) * EDGE_ZONE_RATIO),
  );
  const startDepth = (bounds.start + zone - position) / zone;
  const endDepth = (position - (bounds.end - zone)) / zone;

  if (startDepth > 0) return -getEdgeScrollSpeed(startDepth);
  if (endDepth > 0) return getEdgeScrollSpeed(endDepth);
  return 0;
}

function getEdgeScrollSpeed(depth: number): number {
  const clampedDepth = Math.min(1, depth);
  return (
    EDGE_SCROLL_MIN_PX_PER_SECOND +
    (EDGE_SCROLL_MAX_PX_PER_SECOND - EDGE_SCROLL_MIN_PX_PER_SECOND) * clampedDepth * clampedDepth
  );
}
