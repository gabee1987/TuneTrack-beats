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
  isGridLayout: boolean;
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
    isGridLayout: getComputedStyle(container).display === "grid",
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

function getGridPreviewIndex(
  centerX: number,
  centerY: number,
  slotRects: Box[],
  previewSlotIndex: number,
): number {
  let nextPreviewIndex = 0;

  for (const [slotIndex, cardRect] of slotRects.entries()) {
    if (slotIndex === previewSlotIndex) {
      continue;
    }

    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;

    if (centerY > cardRect.bottom) {
      nextPreviewIndex += 1;
      continue;
    }

    if (centerY >= cardRect.top && centerY <= cardRect.bottom) {
      if (centerX > cardCenterX) {
        nextPreviewIndex += 1;
        continue;
      }

      break;
    }

    if (centerY < cardCenterY) {
      break;
    }
  }

  return nextPreviewIndex;
}

function getHorizontalPreviewIndex(
  centerX: number,
  slotRects: Box[],
  previewSlotIndex: number,
): number {
  let nextPreviewIndex = 0;

  for (const [slotIndex, cardRect] of slotRects.entries()) {
    if (slotIndex === previewSlotIndex) {
      continue;
    }

    if (centerX > cardRect.left + cardRect.width / 2) {
      nextPreviewIndex += 1;
    } else {
      break;
    }
  }

  return nextPreviewIndex;
}

/** `previewSlotIndex` is where the preview sits now; the cards fill every other slot. */
export function getPreviewIndexForActiveRect(
  geometry: TimelineDragGeometry,
  activeRect: Box,
  previewSlotIndex: number,
): number {
  const centerX = activeRect.left + activeRect.width / 2 - geometry.shiftX;
  const centerY = activeRect.top + activeRect.height / 2 - geometry.shiftY;

  return geometry.isGridLayout
    ? getGridPreviewIndex(centerX, centerY, geometry.slotRects, previewSlotIndex)
    : getHorizontalPreviewIndex(centerX, geometry.slotRects, previewSlotIndex);
}
