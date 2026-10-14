import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setElementBox } from "../../../test/stubs/layout";
import { useTimelineEdgeAutoScroll } from "./useTimelineEdgeAutoScroll";

let pendingFrames: FrameRequestCallback[] = [];

function runFrame(frameAt: number) {
  const frames = pendingFrames;
  pendingFrames = [];
  for (const frame of frames) frame(frameAt);
}

function Harness({ isDragging }: { isDragging: boolean }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  useTimelineEdgeAutoScroll(rowRef, isDragging);
  return (
    <div
      data-testid="row"
      ref={(node) => {
        if (node) setElementBox(node, { x: 0, y: 0, width: 400, height: 600, scrollHeight: 3_000 });
        rowRef.current = node;
      }}
    />
  );
}

function movePointerTo(y: number) {
  window.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: y }));
}

describe("useTimelineEdgeAutoScroll", () => {
  beforeEach(() => {
    pendingFrames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => {
      pendingFrames.push(frame);
      return pendingFrames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
      pendingFrames = [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls by frame time while the pointer is held in the bottom zone, and stops after", () => {
    const { getByTestId, rerender } = render(<Harness isDragging />);
    const row = getByTestId("row");

    act(() => movePointerTo(599));
    for (let frame = 0; frame <= 10; frame += 1) runFrame(frame * 16);

    // Deep in the zone: about 1000 px/s, so about 160 px over ten 16 ms frames.
    expect(row.scrollTop).toBeGreaterThan(140);
    expect(row.scrollTop).toBeLessThan(170);

    act(() => movePointerTo(300));
    const beforeMiddle = row.scrollTop;
    runFrame(176);
    expect(row.scrollTop).toBe(beforeMiddle);

    rerender(<Harness isDragging={false} />);
    expect(pendingFrames).toHaveLength(0);
  });

  it("does nothing until a drag starts", () => {
    render(<Harness isDragging={false} />);

    expect(pendingFrames).toHaveLength(0);
  });
});
