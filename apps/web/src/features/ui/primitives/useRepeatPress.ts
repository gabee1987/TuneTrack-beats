import { useCallback, useEffect, useRef } from "react";

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

/**
 * Click handlers for a step button that also repeats while held: one step per tap, and after
 * a short hold a step every 80 ms until release. A hold that repeated does not add a final
 * step on release.
 */
export function useRepeatPress(onStep: () => void, isDisabled: boolean) {
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  const delayRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);
  const didRepeatRef = useRef(false);

  const stop = useCallback(() => {
    window.clearTimeout(delayRef.current);
    window.clearInterval(intervalRef.current);
    delayRef.current = undefined;
    intervalRef.current = undefined;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!isDisabled) return;
    // A disabled button receives no release click to swallow.
    stop();
    didRepeatRef.current = false;
  }, [isDisabled, stop]);

  return {
    onClick: () => {
      if (didRepeatRef.current) {
        didRepeatRef.current = false;
        return;
      }
      stepRef.current();
    },
    onPointerCancel: stop,
    onPointerDown: () => {
      stop();
      didRepeatRef.current = false;
      delayRef.current = window.setTimeout(() => {
        didRepeatRef.current = true;
        stepRef.current();
        intervalRef.current = window.setInterval(() => stepRef.current(), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    },
    onPointerLeave: stop,
    onPointerUp: stop,
  };
}
