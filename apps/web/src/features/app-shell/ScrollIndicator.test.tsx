import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMediaQuery } from "../../test/stubs/matchMedia";
import { FINE_POINTER_QUERY, ScrollIndicator } from "./ScrollIndicator";
import { MIN_THUMB_PX, getScrollThumb } from "./scrollThumb";

describe("getScrollThumb", () => {
  it("sizes the thumb by how much shows and moves it with the scroll position", () => {
    const metrics = { clientHeight: 400, scrollHeight: 1600, top: 100 };

    expect(getScrollThumb({ ...metrics, scrollTop: 0 })).toEqual({ height: 100, top: 100 });
    expect(getScrollThumb({ ...metrics, scrollTop: 600 })).toEqual({ height: 100, top: 250 });
    expect(getScrollThumb({ ...metrics, scrollTop: 1200 })).toEqual({ height: 100, top: 400 });
  });

  it("keeps a long list's thumb easy to see and draws nothing when nothing scrolls", () => {
    expect(
      getScrollThumb({ clientHeight: 400, scrollHeight: 40_000, scrollTop: 0, top: 0 })?.height,
    ).toBe(MIN_THUMB_PX);
    expect(getScrollThumb({ clientHeight: 400, scrollHeight: 400, scrollTop: 0, top: 0 })).toBe(
      null,
    );
  });
});

function buildScroller() {
  const scroller = document.createElement("div");
  Object.defineProperties(scroller, {
    clientHeight: { value: 400 },
    scrollHeight: { value: 1600 },
    scrollTop: { value: 600, writable: true },
  });
  scroller.getBoundingClientRect = () => ({ right: 500, top: 100 }) as DOMRect;
  document.body.append(scroller);
  return scroller;
}

describe("ScrollIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("shows a thumb over the box that scrolls on a mouse screen, then fades it out", () => {
    setMediaQuery(FINE_POINTER_QUERY, true);
    const { container } = render(<ScrollIndicator />);
    const thumb = container.firstElementChild as HTMLElement;
    const scroller = buildScroller();

    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
      vi.advanceTimersToNextFrame();
    });

    expect(thumb.dataset.visible).toBe("true");
    expect(thumb.style.height).toBe("100px");
    expect(thumb.style.transform).toBe("translate3d(497px, 250px, 0)");

    act(() => vi.advanceTimersByTime(900));
    expect(thumb.dataset.visible).toBeUndefined();
  });

  it("leaves touch screens to the system scrollbar", () => {
    setMediaQuery(FINE_POINTER_QUERY, false);
    const { container } = render(<ScrollIndicator />);
    const scroller = buildScroller();

    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
      vi.advanceTimersToNextFrame();
    });

    expect((container.firstElementChild as HTMLElement).dataset.visible).toBeUndefined();
  });
});
