import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { setElementBox } from "../../test/stubs/layout";
import { RangeField } from "./RangeField";
import { RANGE_SETTLE_MS } from "./useRulerScroll";

function renderRange({ value = 10, disabled = false, onChange = vi.fn() } = {}) {
  const view = renderWithProviders(
    <RangeField
      disabled={disabled}
      label="Cards to win"
      max={12}
      min={8}
      onChange={onChange}
      value={value}
    />,
  );
  return { onChange, view };
}

function getScroller(): HTMLElement {
  const scroller = screen.getByRole("button", { name: "Cards to win: 8" }).parentElement;
  if (!scroller) throw new Error("The ruler has no scroller.");
  return scroller;
}

/** Lays the ticks out 20 px apart with `centred` under the centre line of a 100 px scroller. */
function scrollRulerTo(centred: number) {
  const scroller = getScroller();
  setElementBox(scroller, { width: 100 });
  for (const tick of scroller.querySelectorAll<HTMLElement>("[data-range-value]")) {
    const offset = (Number(tick.dataset.rangeValue) - centred) * 20;
    setElementBox(tick, { width: 10, x: 45 + offset });
  }
  fireEvent.scroll(scroller);
  act(() => {
    vi.advanceTimersByTime(16);
  });
}

// jsdom has no PointerEvent, and a plain Event would drop the position React reads.
function pressAt(element: HTMLElement, clientX: number) {
  fireEvent(element, new MouseEvent("pointerdown", { bubbles: true, clientX }));
}

function letRulerSettle() {
  act(() => {
    vi.advanceTimersByTime(RANGE_SETTLE_MS);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("RangeField", () => {
  it("is a named slider that reports its bounds and value", () => {
    renderRange();

    const slider = screen.getByRole("slider", { name: "Cards to win" });
    expect(slider).toHaveAttribute("aria-valuemin", "8");
    expect(slider).toHaveAttribute("aria-valuemax", "12");
    expect(slider).toHaveAttribute("aria-valuenow", "10");
  });

  it("offers one named tick per value, and a tick picks its value", async () => {
    const { onChange } = renderRange();

    expect(screen.getAllByRole("button", { name: /^Cards to win: / })).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Cards to win: 12" }));

    expect(onChange).toHaveBeenCalledWith(12);
  });

  it("steps with the arrow keys and stops at the bounds", () => {
    const { onChange } = renderRange({ value: 12 });
    const slider = screen.getByRole("slider", { name: "Cards to win" });

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "ArrowUp" });

    expect(onChange.mock.calls).toEqual([[11], [12]]);
  });

  it("ignores keys and ticks while disabled and leaves the tab order", async () => {
    const { onChange } = renderRange({ disabled: true });
    const slider = screen.getByRole("slider", { name: "Cards to win" });

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    await userEvent.click(screen.getByRole("button", { name: "Cards to win: 8" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(slider).toHaveAttribute("tabindex", "-1");
  });

  it("previews the value while it moves and commits it once, when the ruler comes to rest", () => {
    vi.useFakeTimers();
    const { onChange } = renderRange();
    const slider = screen.getByRole("slider", { name: "Cards to win" });

    scrollRulerTo(11);
    scrollRulerTo(12);

    expect(slider).toHaveAttribute("aria-valuenow", "12");
    expect(onChange).not.toHaveBeenCalled();

    letRulerSettle();

    expect(onChange.mock.calls).toEqual([[12]]);
  });

  it("waits for a resting finger to lift before it commits", () => {
    vi.useFakeTimers();
    const { onChange } = renderRange();
    const scroller = getScroller();

    fireEvent.touchStart(scroller);
    scrollRulerTo(9);
    letRulerSettle();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.touchEnd(scroller);
    letRulerSettle();

    expect(onChange.mock.calls).toEqual([[9]]);
  });

  it("keeps the previewed value until the new value arrives, and never scrolls under the finger", () => {
    vi.useFakeTimers();
    const { onChange, view } = renderRange();
    const scroller = getScroller();
    const scrollTo = vi.spyOn(scroller, "scrollTo");

    scrollRulerTo(12);
    letRulerSettle();
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "12");

    fireEvent.touchStart(scroller);
    view.rerender(
      <RangeField label="Cards to win" max={12} min={8} onChange={onChange} value={9} />,
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("never picks the tick under a finger that dragged or stopped a moving ruler", () => {
    vi.useFakeTimers();
    const { onChange } = renderRange();
    const scroller = getScroller();
    const tick = screen.getByRole("button", { name: "Cards to win: 12" });

    pressAt(scroller, 100);
    fireEvent.click(tick, { clientX: 140, detail: 1 });

    pressAt(scroller, 100);
    scrollRulerTo(10);
    fireEvent.click(tick, { clientX: 100, detail: 1 });

    scrollRulerTo(10);
    pressAt(scroller, 100);
    fireEvent.click(tick, { clientX: 100, detail: 1 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("still picks a tick on a plain tap after the ruler has settled", () => {
    vi.useFakeTimers();
    const { onChange } = renderRange();
    const scroller = getScroller();

    scrollRulerTo(10);
    letRulerSettle();
    pressAt(scroller, 100);
    fireEvent.click(screen.getByRole("button", { name: "Cards to win: 8" }), {
      clientX: 103,
      detail: 1,
    });

    expect(onChange.mock.calls).toEqual([[8]]);
  });

  it("does not take its own scroll to a new value for the user moving it", () => {
    vi.useFakeTimers();
    const { onChange, view } = renderRange();
    const scroller = getScroller();
    setElementBox(scroller, { scrollWidth: 400, width: 100 });
    for (const tick of scroller.querySelectorAll<HTMLElement>("[data-range-value]")) {
      setElementBox(tick, { width: 20, x: (Number(tick.dataset.rangeValue) - 8) * 40 });
    }
    const scrollTo = vi.spyOn(scroller, "scrollTo");

    view.rerender(
      <RangeField label="Cards to win" max={12} min={8} onChange={onChange} value={12} />,
    );
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", left: 120 });
    Object.defineProperty(scroller, "scrollLeft", { configurable: true, value: 120 });
    fireEvent.scroll(scroller);

    pressAt(scroller, 100);
    fireEvent.click(screen.getByRole("button", { name: "Cards to win: 9" }), {
      clientX: 100,
      detail: 1,
    });
    letRulerSettle();

    expect(onChange.mock.calls).toEqual([[9]]);
  });
});
