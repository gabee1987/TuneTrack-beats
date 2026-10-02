import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  dismissActiveHint,
  getActiveHintId,
  registerHintCandidate,
  subscribeActiveHint,
} from "./hintCoordinator";
import type { HintId } from "./hintState";

const HINT_AUTO_DISMISS_MS = 12_000;

export function useFirstRunHint(id: HintId, isEligible: boolean) {
  const activeHintId = useSyncExternalStore(subscribeActiveHint, getActiveHintId, () => null);
  const isVisible = activeHintId === id;

  const dismiss = useCallback(() => {
    dismissActiveHint(id);
  }, [id]);

  useEffect(() => {
    if (!isEligible) {
      return;
    }
    return registerHintCandidate(id);
  }, [id, isEligible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(dismiss, HINT_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [dismiss, isVisible]);

  return { dismiss, isVisible };
}
