import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMediaQuery } from "../../test/stubs/matchMedia";
import { setViewportSize, setVisualViewportHeight } from "../../test/stubs/viewport";

type ViewportStore = typeof import("./viewportStore");

let store: ViewportStore;

function nextFrame() {
  vi.advanceTimersToNextFrame();
}

describe("viewportStore (05 §2.2, C5)", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    vi.resetModules();
    setMediaQuery("(pointer: coarse)", true);
    setViewportSize(390, 844);
    store = await import("./viewportStore");
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.style.removeProperty("--app-height");
  });

  it("registers exactly one window resize listener however many consumers subscribe", () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const unsubscribes = [
      ...Array.from({ length: 5 }, () => store.subscribeViewport(() => undefined)),
      store.subscribeViewportResize(() => undefined),
      store.subscribeViewportResize(() => undefined),
    ];

    expect(addListener.mock.calls.filter(([type]) => type === "resize")).toHaveLength(1);

    const removeListener = vi.spyOn(window, "removeEventListener");
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    expect(removeListener.mock.calls.filter(([type]) => type === "resize")).toHaveLength(1);
  });

  it("does not notify layout consumers when only the height changes", () => {
    const onChange = vi.fn();
    store.subscribeViewport(onChange);

    for (const height of [800, 760, 700, 844]) {
      setViewportSize(390, height);
      nextFrame();
    }

    expect(onChange).not.toHaveBeenCalled();
    expect(store.getLayoutMode()).toBe("mobile");
  });

  it("coalesces a burst of resize events into one notification per frame", () => {
    const onChange = vi.fn();
    const onResize = vi.fn();
    store.subscribeViewport(onChange);
    store.subscribeViewportResize(onResize);
    setMediaQuery("(pointer: coarse)", false);

    for (const width of [800, 1000, 1200, 1280]) {
      setViewportSize(width, 800);
    }
    expect(onResize).not.toHaveBeenCalled();
    nextFrame();

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getLayoutMode()).toBe("desktop");
  });

  it("reads the window directly while nothing is subscribed", () => {
    expect(store.getLayoutMode()).toBe("mobile");
    setMediaQuery("(pointer: coarse)", false);
    setViewportSize(1280, 800);

    expect(store.getLayoutMode()).toBe("desktop");
  });

  it("writes --app-height from the visual viewport, and only when it changed", () => {
    const setProperty = vi.spyOn(document.documentElement.style, "setProperty");
    store.startAppHeightSync();
    expect(document.documentElement.style.getPropertyValue("--app-height")).toBe("844px");

    setVisualViewportHeight(500);
    nextFrame();
    expect(document.documentElement.style.getPropertyValue("--app-height")).toBe("500px");

    window.dispatchEvent(new Event("resize"));
    nextFrame();

    expect(setProperty.mock.calls.filter(([name]) => name === "--app-height")).toHaveLength(2);
  });
});
