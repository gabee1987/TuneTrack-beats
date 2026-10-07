import { afterEach, describe, expect, it, vi } from "vitest";
import { setElementBox } from "../../../test/stubs/layout";
import {
  applyAncestorScroll,
  applyContainerScroll,
  getPreviewIndexForActiveRect,
  measureTimelineDragGeometry,
} from "./timelineDragGeometry";

const SLOT_SIZE = 100;

function buildRow(
  slotPositions: Array<{ x: number; y: number }>,
  display = "flex",
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.display = display;
  setElementBox(container, { x: 0, y: 0, width: 1000, height: 400 });
  for (const position of slotPositions) {
    const slot = document.createElement("div");
    slot.dataset.timelineSlot = "true";
    setElementBox(slot, { ...position, width: SLOT_SIZE, height: SLOT_SIZE });
    container.append(slot);
  }
  document.body.append(container);
  return container;
}

function activeRectAt(centerX: number, centerY = 50) {
  const left = centerX - SLOT_SIZE / 2;
  const top = centerY - SLOT_SIZE / 2;
  return {
    bottom: top + SLOT_SIZE,
    height: SLOT_SIZE,
    left,
    right: left + SLOT_SIZE,
    top,
    width: SLOT_SIZE,
  };
}

const HORIZONTAL_SLOTS = [0, 1, 2, 3].map((slotIndex) => ({ x: slotIndex * 110, y: 0 }));

describe("timelineDragGeometry", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("skips the preview's own slot when counting the cards before the pointer", () => {
    const geometry = measureTimelineDragGeometry(buildRow(HORIZONTAL_SLOTS));

    // Card centres with the preview in slot 0: 160, 270, 380.
    expect(getPreviewIndexForActiveRect(geometry, activeRectAt(150), 0)).toBe(0);
    expect(getPreviewIndexForActiveRect(geometry, activeRectAt(300), 0)).toBe(2);
    // With the preview in slot 3 the cards sit in slots 0–2: centres 50, 160, 270.
    expect(getPreviewIndexForActiveRect(geometry, activeRectAt(150), 3)).toBe(1);
  });

  it("follows a scroll of the row without reading the slots again", () => {
    const container = buildRow(HORIZONTAL_SLOTS);
    const geometry = measureTimelineDragGeometry(container);
    container.scrollLeft = 200;

    const scrolled = applyContainerScroll(geometry, container);

    // The cards moved 200 px left, so a pointer at 100 now lies past the card at 270 − 200.
    expect(getPreviewIndexForActiveRect(scrolled, activeRectAt(100), 0)).toBe(2);
  });

  it("follows the row when an ancestor scrolls", () => {
    const container = buildRow(HORIZONTAL_SLOTS);
    const geometry = measureTimelineDragGeometry(container);
    setElementBox(container, { x: 0, y: -300, width: 1000, height: 400 });

    const scrolled = applyAncestorScroll(geometry, container);

    expect(scrolled.containerRect.top).toBe(-300);
    expect(getPreviewIndexForActiveRect(scrolled, activeRectAt(300, -250), 0)).toBe(2);
  });

  it("counts whole rows above the pointer in a grid", () => {
    const gridSlots = [0, 1, 2, 3, 4, 5].map((slotIndex) => ({
      x: (slotIndex % 3) * 110,
      y: Math.floor(slotIndex / 3) * 110,
    }));
    const geometry = measureTimelineDragGeometry(buildRow(gridSlots, "grid"));

    expect(geometry.isGridLayout).toBe(true);
    // Preview in slot 0; the second row holds cards 2–4 (slots 3–5).
    expect(getPreviewIndexForActiveRect(geometry, activeRectAt(170, 160), 0)).toBe(4);
  });

  it("does all its reads at measurement", () => {
    const container = buildRow(HORIZONTAL_SLOTS);
    const geometry = measureTimelineDragGeometry(container);
    const rectRead = vi.spyOn(Element.prototype, "getBoundingClientRect");

    getPreviewIndexForActiveRect(geometry, activeRectAt(300), 1);

    expect(rectRead).not.toHaveBeenCalled();
    rectRead.mockRestore();
  });
});
