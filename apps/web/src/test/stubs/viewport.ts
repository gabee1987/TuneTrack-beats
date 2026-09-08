import { setMediaQuery } from "./matchMedia";

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 768;

interface VisualViewportStub extends EventTarget {
  height: number;
  width: number;
  offsetTop: number;
  offsetLeft: number;
  pageTop: number;
  pageLeft: number;
  scale: number;
}

let visualViewport: VisualViewportStub | null = null;

function createVisualViewport(): VisualViewportStub {
  const target = new EventTarget() as VisualViewportStub;
  target.width = DEFAULT_WIDTH;
  target.height = DEFAULT_HEIGHT;
  target.offsetTop = 0;
  target.offsetLeft = 0;
  target.pageTop = 0;
  target.pageLeft = 0;
  target.scale = 1;
  return target;
}

export function installViewport(): void {
  if (typeof window === "undefined") {
    return;
  }

  visualViewport = createVisualViewport();
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    writable: true,
    value: visualViewport,
  });
}

/**
 * Resize the window and notify listeners. Also updates `visualViewport` so the two agree,
 * which is what a real browser does for everything except an on-screen keyboard.
 */
export function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });

  if (visualViewport) {
    visualViewport.width = width;
    visualViewport.height = height;
    visualViewport.dispatchEvent(new Event("resize"));
  }

  window.dispatchEvent(new Event("resize"));
}

/** Shrink only the visual viewport, as an on-screen keyboard does. */
export function setVisualViewportHeight(height: number): void {
  if (!visualViewport) {
    return;
  }

  visualViewport.height = height;
  visualViewport.dispatchEvent(new Event("resize"));
}

/** Put the harness into the layout mode the app would resolve for a phone. */
export function useMobileViewport(): void {
  setMediaQuery("(pointer: coarse)", true);
  setViewportSize(390, 844);
}

/** Put the harness into the layout mode the app would resolve for a desktop browser. */
export function useDesktopViewport(): void {
  setMediaQuery("(pointer: coarse)", false);
  setViewportSize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
}

export function resetViewport(): void {
  installViewport();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: DEFAULT_WIDTH,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: DEFAULT_HEIGHT,
  });
}
