import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInterpolatedPlaybackPosition } from "./useInterpolatedPlaybackPosition";

const START_MS = 1_700_000_000_000;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useInterpolatedPlaybackPosition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START_MS);
  });

  afterEach(() => {
    setVisibility("visible");
    vi.useRealTimers();
  });

  it("advances between snapshots while playing", () => {
    const { result } = renderHook(() =>
      useInterpolatedPlaybackPosition({
        duration: 180_000,
        isPlaying: true,
        position: 10_000,
        positionUpdatedAtMs: START_MS,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current).toBe(13_000);
  });

  it("stops ticking while the document is hidden and resumes when it returns", () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useInterpolatedPlaybackPosition({
        duration: 180_000,
        isPlaying: true,
        position: 0,
        positionUpdatedAtMs: START_MS,
      });
    });

    act(() => setVisibility("hidden"));
    const rendersWhileHidden = renders;
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(renders).toBe(rendersWhileHidden);

    act(() => setVisibility("visible"));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(11_000);
  });

  it("holds the snapshot while paused, without a timer", () => {
    const { result } = renderHook(() =>
      useInterpolatedPlaybackPosition({
        duration: 180_000,
        isPlaying: false,
        position: 42_000,
        positionUpdatedAtMs: START_MS,
      }),
    );

    expect(vi.getTimerCount()).toBe(0);
    expect(result.current).toBe(42_000);
  });
});
