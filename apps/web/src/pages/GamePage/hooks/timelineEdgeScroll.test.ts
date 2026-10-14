import { afterEach, describe, expect, it } from "vitest";
import { setElementBox } from "../../../test/stubs/layout";
import {
  getTimelineEdgeScrollVelocity,
  measureTimelineEdgeScrollBounds,
  type TimelineEdgeScrollBounds,
} from "./timelineEdgeScroll";

const VERTICAL: TimelineEdgeScrollBounds = { axis: "y", end: 600, start: 100 };

function velocityAtY(y: number) {
  return getTimelineEdgeScrollVelocity(VERTICAL, { x: 200, y });
}

function buildScrollableRow(overflow: { height?: number; width?: number }) {
  const row = document.createElement("div");
  setElementBox(row, {
    x: 0,
    y: 100,
    width: 400,
    height: 700,
    scrollHeight: overflow.height ?? 700,
    scrollWidth: overflow.width ?? 400,
  });
  document.body.append(row);
  return row;
}

describe("timeline edge scroll", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("stays still in the middle and scrolls towards the edge the pointer is near", () => {
    expect(velocityAtY(350)).toBe(0);
    expect(velocityAtY(120)).toBeLessThan(0);
    expect(velocityAtY(580)).toBeGreaterThan(0);
  });

  it("starts gently on entering the zone and speeds up with depth, capped past the edge", () => {
    const zoneEntry = velocityAtY(600 - 79);
    const deep = velocityAtY(595);

    expect(zoneEntry).toBeGreaterThanOrEqual(160);
    expect(deep).toBeGreaterThan(zoneEntry * 3);
    expect(velocityAtY(900)).toBe(1_000);
    expect(velocityAtY(0)).toBe(-1_000);
  });

  it("ends a vertical grid at the action dock's top edge when the dock covers it", () => {
    const row = buildScrollableRow({ height: 2_000 });
    const dock = document.createElement("div");
    dock.dataset.actionDock = "true";
    setElementBox(dock, { x: 0, y: 640, width: 400, height: 160 });
    document.body.append(dock);

    expect(measureTimelineEdgeScrollBounds(row)).toEqual({ axis: "y", end: 640, start: 100 });
  });

  it("uses the row's own edges when no dock covers it, and the sides for a horizontal row", () => {
    expect(measureTimelineEdgeScrollBounds(buildScrollableRow({ height: 2_000 }))).toEqual({
      axis: "y",
      end: 800,
      start: 100,
    });
    expect(measureTimelineEdgeScrollBounds(buildScrollableRow({ width: 1_600 }))).toEqual({
      axis: "x",
      end: 400,
      start: 0,
    });
    expect(measureTimelineEdgeScrollBounds(buildScrollableRow({}))).toBeNull();
  });
});
