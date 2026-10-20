import { describe, expect, it, vi } from "vitest";
import type { TimelineDragGeometry } from "./timelineDragGeometry";
import { glideTimelineReorder } from "./timelineReorderGlide";

function slot(left: number) {
  return { bottom: 140, height: 120, left, right: left + 100, top: 20, width: 100 };
}

const geometry: TimelineDragGeometry = {
  containerRect: slot(0),
  scrollLeft: 0,
  scrollTop: 0,
  shiftX: 0,
  shiftY: 0,
  slotRects: [slot(0), slot(110), slot(220)],
};

function buildRow(progressByCall: Array<number | null>) {
  const row = document.createElement("div");
  const animateCalls: Array<{ element: HTMLElement; from: string }> = [];
  for (const itemId of ["card-a", "preview", "card-b"]) {
    const element = document.createElement("div");
    element.dataset.timelineItemId = itemId;
    element.animate = vi.fn((keyframes: Keyframe[]) => {
      animateCalls.push({ element, from: String(keyframes[0]?.transform) });
      const progress = progressByCall.shift() ?? null;
      return {
        cancel: vi.fn(),
        effect: { getComputedTiming: () => ({ progress }) },
      } as unknown as Animation;
    }) as HTMLElement["animate"];
    row.append(element);
  }
  return { animateCalls, row };
}

describe("glideTimelineReorder", () => {
  it("glides only the cards whose slot changed, from their old slot", () => {
    const { animateCalls, row } = buildRow([]);

    glideTimelineReorder(
      row,
      ["card-a", "preview", "card-b"],
      ["preview", "card-a", "card-b"],
      geometry,
    );

    expect(animateCalls.map((call) => [call.element.dataset.timelineItemId, call.from])).toEqual([
      ["card-a", "translate(-110px, 0px)"],
      ["preview", "translate(110px, 0px)"],
    ]);
  });

  it("continues an interrupted glide from where the card is on screen", () => {
    // The first glide of card-a is 25% done (eased) when the next reorder arrives.
    const { animateCalls, row } = buildRow([0.25, 0.25]);

    glideTimelineReorder(
      row,
      ["card-a", "preview", "card-b"],
      ["preview", "card-a", "card-b"],
      geometry,
    );
    glideTimelineReorder(
      row,
      ["preview", "card-a", "card-b"],
      ["card-a", "preview", "card-b"],
      geometry,
    );

    const cardAGlides = animateCalls.filter(
      (call) => call.element.dataset.timelineItemId === "card-a",
    );
    // Back from slot 1 to slot 0 (+110) plus the 75% of the first glide still ahead (-82.5).
    expect(cardAGlides.map((call) => call.from)).toEqual([
      "translate(-110px, 0px)",
      "translate(27.5px, 0px)",
    ]);
  });
});
