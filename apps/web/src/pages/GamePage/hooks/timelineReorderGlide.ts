import { TIMELINE_REORDER_DURATION_MS, TIMELINE_REORDER_EASING } from "../gamePage.constants";
import type { TimelineDragGeometry } from "./timelineDragGeometry";

interface RunningGlide {
  animation: Animation;
  fromX: number;
  fromY: number;
}

const runningGlides = new WeakMap<Element, RunningGlide>();

/**
 * Glides every card whose slot changed, from its old slot to its new one. The offsets come
 * from the slot rects cached at drag start, so no layout is read. A glide interrupted by the
 * next reorder restarts from where the card is on screen, so a quick reorder never jumps.
 */
export function glideTimelineReorder(
  container: HTMLElement,
  previousOrder: string[],
  nextOrder: string[],
  geometry: TimelineDragGeometry,
) {
  for (const element of Array.from(container.children)) {
    const itemId = element instanceof HTMLElement ? element.dataset.timelineItemId : undefined;
    // jsdom has no Web Animations API.
    if (!itemId || typeof element.animate !== "function") continue;

    const fromSlot = geometry.slotRects[previousOrder.indexOf(itemId)];
    const toSlot = geometry.slotRects[nextOrder.indexOf(itemId)];
    if (!fromSlot || !toSlot || fromSlot === toSlot) continue;

    const running = runningGlides.get(element);
    // `progress` is eased and null once finished.
    const remainingShare = running
      ? 1 - (running.animation.effect?.getComputedTiming().progress ?? 1)
      : 0;
    const fromX = fromSlot.left - toSlot.left + (running?.fromX ?? 0) * remainingShare;
    const fromY = fromSlot.top - toSlot.top + (running?.fromY ?? 0) * remainingShare;
    running?.animation.cancel();

    const animation = element.animate(
      [{ transform: `translate(${fromX}px, ${fromY}px)` }, { transform: "translate(0, 0)" }],
      { duration: TIMELINE_REORDER_DURATION_MS, easing: TIMELINE_REORDER_EASING },
    );
    const glide = { animation, fromX, fromY };
    runningGlides.set(element, glide);
    animation.onfinish = () => {
      if (runningGlides.get(element) === glide) runningGlides.delete(element);
    };
  }
}
