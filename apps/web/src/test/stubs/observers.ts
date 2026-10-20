type ResizeCallback = ResizeObserverCallback;
type IntersectionCallback = IntersectionObserverCallback;

interface ObservedResize {
  callback: ResizeCallback;
  observer: ResizeObserver;
  targets: Set<Element>;
}

interface ObservedIntersection {
  callback: IntersectionCallback;
  observer: IntersectionObserver;
  targets: Set<Element>;
}

const resizeObservers = new Set<ObservedResize>();
const intersectionObservers = new Set<ObservedIntersection>();

export function installObservers(): void {
  if (typeof globalThis === "undefined") {
    return;
  }

  class StubResizeObserver implements ResizeObserver {
    private readonly entry: ObservedResize;

    public constructor(callback: ResizeCallback) {
      this.entry = { callback, observer: this, targets: new Set() };
      resizeObservers.add(this.entry);
    }

    public observe(target: Element): void {
      this.entry.targets.add(target);
    }

    public unobserve(target: Element): void {
      this.entry.targets.delete(target);
    }

    public disconnect(): void {
      this.entry.targets.clear();
      resizeObservers.delete(this.entry);
    }
  }

  class StubIntersectionObserver implements IntersectionObserver {
    public readonly root: Element | Document | null = null;
    public readonly rootMargin: string = "";
    public readonly thresholds: readonly number[] = [0];

    private readonly entry: ObservedIntersection;

    public constructor(callback: IntersectionCallback) {
      this.entry = { callback, observer: this, targets: new Set() };
      intersectionObservers.add(this.entry);
    }

    public observe(target: Element): void {
      this.entry.targets.add(target);
    }

    public unobserve(target: Element): void {
      this.entry.targets.delete(target);
    }

    public disconnect(): void {
      this.entry.targets.clear();
      intersectionObservers.delete(this.entry);
    }

    public takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver =
    StubIntersectionObserver as unknown as typeof IntersectionObserver;
}

/** Fire every live ResizeObserver with its observed targets. */
export function triggerResize(): void {
  for (const { callback, observer, targets } of resizeObservers) {
    const entries = [...targets].map(
      (target) =>
        ({
          target,
          contentRect: target.getBoundingClientRect(),
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        }) as unknown as ResizeObserverEntry,
    );

    if (entries.length > 0) {
      callback(entries, observer);
    }
  }
}

/** Fire every live IntersectionObserver, reporting each target as visible or not. */
export function triggerIntersection(isIntersecting: boolean): void {
  for (const { callback, observer, targets } of intersectionObservers) {
    const entries = [...targets].map(
      (target) =>
        ({
          target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: 0,
        }) as unknown as IntersectionObserverEntry,
    );

    if (entries.length > 0) {
      callback(entries, observer);
    }
  }
}
