/**
 * jsdom performs no layout, so every element reports zero for every geometry property.
 * Anything that measures then sees an empty viewport and renders nothing — most visibly
 * `@tanstack/react-virtual`, which reads `offsetWidth` / `offsetHeight` (not
 * `getBoundingClientRect`) and so produces no rows at all.
 *
 * This gives every element a plausible default box, with per-element overrides for tests
 * that need specific geometry such as a short scroll viewport or an overflowing row.
 */

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 768;

export interface StubBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Defaults to `width`, so nothing overflows unless a test says so. */
  scrollWidth: number;
  /** Defaults to `height`. */
  scrollHeight: number;
}

const overrides = new WeakMap<Element, StubBox>();

function boxFor(element: Element): StubBox {
  const override = overrides.get(element);
  if (override) {
    return override;
  }

  return {
    x: 0,
    y: 0,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    scrollWidth: DEFAULT_WIDTH,
    scrollHeight: DEFAULT_HEIGHT,
  };
}

function toDomRect(box: StubBox): DOMRect {
  const { x, y, width, height } = box;

  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect;
}

function defineMeasurement(
  prototype: object,
  property: string,
  read: (box: StubBox) => number,
): void {
  Object.defineProperty(prototype, property, {
    configurable: true,
    get(this: Element) {
      return read(boxFor(this));
    },
  });
}

export function installElementRects(): void {
  if (typeof Element === "undefined") {
    return;
  }

  Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
    return toDomRect(boxFor(this));
  };

  defineMeasurement(Element.prototype, "clientWidth", (box) => box.width);
  defineMeasurement(Element.prototype, "clientHeight", (box) => box.height);
  defineMeasurement(Element.prototype, "scrollWidth", (box) => box.scrollWidth);
  defineMeasurement(Element.prototype, "scrollHeight", (box) => box.scrollHeight);

  if (typeof HTMLElement !== "undefined") {
    defineMeasurement(HTMLElement.prototype, "offsetWidth", (box) => box.width);
    defineMeasurement(HTMLElement.prototype, "offsetHeight", (box) => box.height);
    defineMeasurement(HTMLElement.prototype, "offsetTop", (box) => box.y);
    defineMeasurement(HTMLElement.prototype, "offsetLeft", (box) => box.x);
  }
}

/**
 * Give one element a specific box. Omitted dimensions fall back to the defaults, and
 * `scrollWidth` / `scrollHeight` default to the element's own width / height so it does
 * not overflow unless asked to.
 */
export function setElementBox(element: Element, box: Partial<StubBox>): void {
  const width = box.width ?? DEFAULT_WIDTH;
  const height = box.height ?? DEFAULT_HEIGHT;

  overrides.set(element, {
    x: box.x ?? 0,
    y: box.y ?? 0,
    width,
    height,
    scrollWidth: box.scrollWidth ?? width,
    scrollHeight: box.scrollHeight ?? height,
  });
}
