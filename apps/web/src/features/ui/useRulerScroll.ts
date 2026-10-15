import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { triggerPressHaptic } from "../../services/haptics/triggerPressHaptic";

/** Scroll events stop this long before the ruler counts as settled (momentum and snap included). */
export const RANGE_SETTLE_MS = 140;
/** A finger that moves further than this between down and up was dragging, not tapping. */
const TAP_SLOP_PX = 8;
/** One short pulse per value the ruler passes, like the detent of a physical dial. */
const DETENT_HAPTIC_MS = 8;

interface PointerGesture {
  hasScrolled: boolean;
  startedWhileScrolling: boolean;
  x: number;
  y: number;
}

interface UseRulerScrollOptions {
  disabled: boolean;
  max: number;
  min: number;
  onChange: (nextValue: number) => void;
  /** Re-centres the ruler when its ticks change width. */
  tickWidth: number;
  value: number;
}

/**
 * The ruler's scrolling (`22` S4): the value under the centre line is previewed while it moves and
 * committed once, when it comes to rest; a drag, or a tap that stops a moving ruler, never picks
 * the tick under the finger; and a value arriving mid-gesture never moves the ruler. Each value the
 * ruler passes is felt as a detent, and the step buttons move the same preview, so a held button
 * also sends one change when it is released.
 */
export function useRulerScroll({
  disabled,
  max,
  min,
  onChange,
  tickWidth,
  value,
}: UseRulerScrollOptions) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const isScrollSelectionRef = useRef(false);
  const isScrollingRef = useRef(false);
  const isTouchingRef = useRef(false);
  const gestureRef = useRef<PointerGesture | null>(null);
  // Where the ruler's own scrollTo put it; scroll events at that spot are not the user moving it.
  const programmaticLeftRef = useRef<number | null>(null);
  // The value under the centre line while the ruler moves; null once the parent has the value.
  const [draftValue, setDraftValue] = useState<number | null>(null);
  // Where the step buttons sent the ruler; it wins over the tick nearest the centre line.
  const steppedValueRef = useRef<number | null>(null);
  // The last value the user felt, so a detent fires once per value and never for the server's echo.
  const feltValueRef = useRef(value);
  const shownValue = draftValue ?? value;
  const latestRef = useRef({ disabled, onChange, shownValue, value });
  latestRef.current = { disabled, onChange, shownValue, value };

  useEffect(() => {
    setDraftValue(null);
    feltValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (isScrollSelectionRef.current) {
      isScrollSelectionRef.current = false;
      return;
    }

    if (isScrollingRef.current || isTouchingRef.current) {
      return;
    }

    programmaticLeftRef.current = scrollScrollerToValue(scrollerRef.current, value);
  }, [tickWidth, value]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        // Done right after a step or a flick closes the sheet before the ruler settles.
        const current = latestRef.current;
        const pendingValue = steppedValueRef.current ?? current.shownValue;
        if (!current.disabled && pendingValue !== current.value) current.onChange(pendingValue);
      }
    },
    [],
  );

  function scheduleSettle() {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }

    settleTimerRef.current = window.setTimeout(settle, RANGE_SETTLE_MS);
  }

  function settle() {
    settleTimerRef.current = null;

    // A resting finger is not the end of a drag; lifting it schedules the commit again.
    if (isTouchingRef.current) {
      return;
    }

    isScrollingRef.current = false;
    const current = latestRef.current;
    const nearestValue = steppedValueRef.current ?? findNearestValue(scrollerRef.current);
    steppedValueRef.current = null;

    if (current.disabled || nearestValue === null || nearestValue === current.value) {
      setDraftValue(null);
      if (current.disabled) {
        programmaticLeftRef.current = scrollScrollerToValue(scrollerRef.current, current.value);
      }
      return;
    }

    setDraftValue(nearestValue);
    isScrollSelectionRef.current = true;
    current.onChange(nearestValue);
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    const programmaticLeft = programmaticLeftRef.current;

    if (
      programmaticLeft !== null &&
      scroller &&
      Math.abs(scroller.scrollLeft - programmaticLeft) < 1
    ) {
      return;
    }

    programmaticLeftRef.current = null;
    steppedValueRef.current = null;
    isScrollingRef.current = true;

    if (gestureRef.current) {
      gestureRef.current.hasScrolled = true;
    }

    if (animationFrameRef.current === null) {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        const nearestValue = findNearestValue(scrollerRef.current);
        if (nearestValue === null) return;
        feelDetent(nearestValue);
        setDraftValue(nearestValue);
      });
    }

    scheduleSettle();
  }

  function feelDetent(nextValue: number) {
    if (nextValue === feltValueRef.current) return;
    feltValueRef.current = nextValue;
    triggerPressHaptic(DETENT_HAPTIC_MS);
  }

  /** The − and + buttons: move the preview one value and commit it once the presses stop. */
  function stepBy(delta: number) {
    const current = latestRef.current;
    const base = steppedValueRef.current ?? current.shownValue;
    const nextValue = Math.min(max, Math.max(min, base + delta));
    if (current.disabled || nextValue === base) return;

    steppedValueRef.current = nextValue;
    feelDetent(nextValue);
    setDraftValue(nextValue);
    programmaticLeftRef.current = scrollScrollerToValue(scrollerRef.current, nextValue);
    scheduleSettle();
  }

  function handleTouchEnd() {
    isTouchingRef.current = false;
    if (isScrollingRef.current) scheduleSettle();
  }

  const scrollerProps = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      gestureRef.current = {
        hasScrolled: false,
        // A tap that stops a moving ruler only stops it.
        startedWhileScrolling: isScrollingRef.current,
        x: event.clientX,
        y: event.clientY,
      };
    },
    onScroll: handleScroll,
    onTouchCancel: handleTouchEnd,
    onTouchEnd: handleTouchEnd,
    onTouchStart: () => {
      isTouchingRef.current = true;
    },
    ref: scrollerRef,
  };

  function handleTickClick(event: MouseEvent<HTMLButtonElement>, rangeValue: number) {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    // Keyboard and assistive-technology activations have no pointer position (`detail` 0).
    const isPointerClick = event.detail > 0;

    if (isPointerClick && gesture && wasDrag(gesture, event)) {
      return;
    }

    feelDetent(rangeValue);
    onChange(rangeValue);
  }

  return { handleTickClick, scrollerProps, shownValue, stepBy };
}

function findNearestValue(scroller: HTMLDivElement | null): number | null {
  if (!scroller) {
    return null;
  }

  const scrollerCenter = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
  let nearestValue: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const tick of scroller.querySelectorAll<HTMLElement>("[data-range-value]")) {
    const tickCenter = tick.getBoundingClientRect().left + tick.offsetWidth / 2;
    const distance = Math.abs(tickCenter - scrollerCenter);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestValue = Number(tick.dataset.rangeValue);
    }
  }

  return nearestValue;
}

/** Centres `target` and returns the new scroll position, or null when the ruler is already there. */
function scrollScrollerToValue(scroller: HTMLDivElement | null, target: number): number | null {
  const selectedTick = scroller?.querySelector<HTMLElement>(`[data-range-value="${target}"]`);

  if (!scroller || !selectedTick) {
    return null;
  }

  const nextScrollLeft =
    selectedTick.offsetLeft - scroller.clientWidth / 2 + selectedTick.offsetWidth / 2;
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const left = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));

  if (Math.abs(scroller.scrollLeft - left) < 1) {
    return null;
  }

  scroller.scrollTo({
    // Snap layout already provides the physical movement; a smooth scroll would fight it.
    behavior: "auto",
    left,
  });
  return left;
}

function wasDrag(gesture: PointerGesture, event: MouseEvent<HTMLButtonElement>): boolean {
  const movedX = Math.abs(event.clientX - gesture.x);
  const movedY = Math.abs(event.clientY - gesture.y);

  return (
    gesture.hasScrolled ||
    gesture.startedWhileScrolling ||
    movedX > TAP_SLOP_PX ||
    movedY > TAP_SLOP_PX
  );
}
