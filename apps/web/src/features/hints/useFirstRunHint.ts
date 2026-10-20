import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isUnderOverlay, subscribeOverlayStack } from "../overlay";
import {
  acknowledgeHint,
  getActiveHintId,
  pauseHints,
  registerHintCandidate,
  subscribeActiveHint,
} from "./hintCoordinator";
import type { HintId } from "./hintState";

/** At least half the anchor must be on screen before its hint may appear (`04` §7). */
const ANCHOR_VISIBLE_RATIO = 0.5;

export function useFirstRunHint(id: HintId, anchor: HTMLElement | null, isEligible: boolean) {
  const activeHintId = useSyncExternalStore(subscribeActiveHint, getActiveHintId, () => null);
  const isAnchorShown = useIsAnchorShown(anchor);
  const isCandidate = isEligible && isAnchorShown;
  const isVisible = activeHintId === id;

  const dismiss = useCallback(() => {
    acknowledgeHint(id);
  }, [id]);

  useEffect(() => {
    if (!isCandidate) {
      return;
    }
    return registerHintCandidate(id);
  }, [id, isCandidate]);

  return { dismiss, isVisible };
}

/** On screen and not under an overlay: a hint never points at something the player cannot see. */
function useIsAnchorShown(anchor: HTMLElement | null): boolean {
  const [isInView, setIsInView] = useState(false);
  const isCovered = useSyncExternalStore(
    subscribeOverlayStack,
    () => anchor !== null && isUnderOverlay(anchor),
    () => false,
  );

  useEffect(() => {
    if (!anchor) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView((entry?.intersectionRatio ?? 0) >= ANCHOR_VISIBLE_RATIO),
      { threshold: ANCHOR_VISIBLE_RATIO },
    );
    observer.observe(anchor);
    return () => {
      observer.disconnect();
      setIsInView(false);
    };
  }, [anchor]);

  return isInView && !isCovered;
}

/** No hint appears while `isPaused` holds, for example during a drag (`04` §7.1). */
export function usePauseHints(isPaused: boolean): void {
  useEffect(() => (isPaused ? pauseHints() : undefined), [isPaused]);
}
