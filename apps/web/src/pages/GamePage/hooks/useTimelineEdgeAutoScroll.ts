import { useEffect, type RefObject } from "react";
import {
  getTimelineEdgeScrollVelocity,
  measureTimelineEdgeScrollBounds,
} from "./timelineEdgeScroll";

/** A long frame (tab switch, GC pause) must not turn into one big jump. */
const MAX_FRAME_STEP_MS = 50;

/**
 * Scrolls the timeline while a dragged card is held near its edge, one step per animation
 * frame and scaled by frame time, so the speed is smooth and independent of the pointer event
 * rate. dnd-kit's own auto-scroll stepped on a timer and only knew the screen edges.
 */
export function useTimelineEdgeAutoScroll(
  timelineRowRef: RefObject<HTMLElement | null>,
  isDragging: boolean,
) {
  useEffect(() => {
    const container = timelineRowRef.current;
    const bounds = isDragging && container ? measureTimelineEdgeScrollBounds(container) : null;

    if (!container || !bounds) {
      return;
    }

    let pointer: { x: number; y: number } | null = null;
    let previousFrameAt: number | null = null;
    let pendingDistance = 0;
    let frameId = requestAnimationFrame(step);

    function handlePointerMove(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY };
    }

    function step(frameAt: number) {
      const elapsedMs =
        previousFrameAt === null ? 0 : Math.min(frameAt - previousFrameAt, MAX_FRAME_STEP_MS);
      previousFrameAt = frameAt;
      const velocity = pointer && bounds ? getTimelineEdgeScrollVelocity(bounds, pointer) : 0;

      // Browsers round scroll offsets, so sub-pixel steps are carried to the next frame.
      pendingDistance = velocity === 0 ? 0 : pendingDistance + (velocity * elapsedMs) / 1000;
      const wholePixels = Math.trunc(pendingDistance);
      if (container && wholePixels !== 0) {
        pendingDistance -= wholePixels;
        if (bounds?.axis === "y") {
          container.scrollTop += wholePixels;
        } else {
          container.scrollLeft += wholePixels;
        }
      }

      frameId = requestAnimationFrame(step);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [isDragging, timelineRowRef]);
}
