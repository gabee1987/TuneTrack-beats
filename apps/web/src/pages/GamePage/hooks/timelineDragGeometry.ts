type Box = Pick<DOMRectReadOnly, "bottom" | "height" | "left" | "right" | "top" | "width">;

export const TIMELINE_SLOT_SELECTOR = "[data-timeline-slot='true']";

/**
 * Timeline layout captured once at drag start, so a pointer move does no layout reads (05
 * §2.2). Every slot has the same size, so card `i` sits in slot `i` before the preview and
 * in slot `i + 1` after it; the slot rects therefore stay valid after a reorder. Scrolling
 * only shifts them, which `shiftX`/`shiftY` track.
 */
export interface TimelineDragGeometry {
  containerRect: Box;
  scrollLeft: number;
  scrollTop: number;
  shiftX: number;
  shiftY: number;
  slotRects: Box[];
}

function toBox(rect: DOMRectReadOnly): Box {
  const { bottom, height, left, right, top, width } = rect;
  return { bottom, height, left, right, top, width };
}

export function measureTimelineDragGeometry(container: HTMLElement): TimelineDragGeometry {
  return {
    containerRect: toBox(container.getBoundingClientRect()),
    scrollLeft: container.scrollLeft,
    scrollTop: container.scrollTop,
    shiftX: 0,
    shiftY: 0,
    slotRects: Array.from(container.querySelectorAll<HTMLElement>(TIMELINE_SLOT_SELECTOR), (slot) =>
      toBox(slot.getBoundingClientRect()),
    ),
  };
}

export function applyContainerScroll(
  geometry: TimelineDragGeometry,
  container: HTMLElement,
): TimelineDragGeometry {
  const { scrollLeft, scrollTop } = container;
  return {
    ...geometry,
    scrollLeft,
    scrollTop,
    shiftX: geometry.shiftX - (scrollLeft - geometry.scrollLeft),
    shiftY: geometry.shiftY - (scrollTop - geometry.scrollTop),
  };
}

export function applyAncestorScroll(
  geometry: TimelineDragGeometry,
  container: HTMLElement,
): TimelineDragGeometry {
  const containerRect = toBox(container.getBoundingClientRect());
  return {
    ...geometry,
    containerRect,
    shiftX: geometry.shiftX + containerRect.left - geometry.containerRect.left,
    shiftY: geometry.shiftY + containerRect.top - geometry.containerRect.top,
  };
}

/**
 * The preview stays in its slot until the card centre leaves that slot by this share of a slot,
 * so a card held on a slot boundary does not flip between two slots.
 */
const SLOT_KEEP_MARGIN_RATIO = 0.08;

function isInsideSlot(centerX: number, centerY: number, slotRect: Box): boolean {
  const marginX = slotRect.width * SLOT_KEEP_MARGIN_RATIO;
  const marginY = slotRect.height * SLOT_KEEP_MARGIN_RATIO;
  return (
    centerX >= slotRect.left - marginX &&
    centerX <= slotRect.right + marginX &&
    centerY >= slotRect.top - marginY &&
    centerY <= slotRect.bottom + marginY
  );
}

function getNearestSlotIndex(centerX: number, centerY: number, slotRects: Box[]): number {
  let nearestSlotIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [slotIndex, slotRect] of slotRects.entries()) {
    const distance = Math.hypot(
      centerX - (slotRect.left + slotRect.width / 2),
      centerY - (slotRect.top + slotRect.height / 2),
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSlotIndex = slotIndex;
    }
  }

  return nearestSlotIndex;
}

/** `previewSlotIndex` is where the preview sits now; the cards fill every other slot. */
export function getPreviewIndexForActiveRect(
  geometry: TimelineDragGeometry,
  activeRect: Box,
  previewSlotIndex: number,
): number {
  const centerX = activeRect.left + activeRect.width / 2 - geometry.shiftX;
  const centerY = activeRect.top + activeRect.height / 2 - geometry.shiftY;

  const currentSlotRect = geometry.slotRects[previewSlotIndex];

  // The card goes to the slot under its centre, as the drop shows it: half over a neighbour
  // is enough, where the old rule needed the card fully over it (20 B23).
  if (currentSlotRect && isInsideSlot(centerX, centerY, currentSlotRect)) {
    return previewSlotIndex;
  }

  return getNearestSlotIndex(centerX, centerY, geometry.slotRects);
}
