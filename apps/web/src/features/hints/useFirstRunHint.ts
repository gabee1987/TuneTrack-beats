import { useCallback, useEffect, useState } from "react";
import { hasSeenHint, markHintSeen, type HintId } from "./hintState";

const HINT_DELAY_MS = 1_500;
const HINT_AUTO_DISMISS_MS = 12_000;

export function useFirstRunHint(id: HintId, isEligible: boolean) {
  const [isVisible, setIsVisible] = useState(false);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!isEligible || hasSeenHint(id)) {
      setIsVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      markHintSeen(id);
      setIsVisible(true);
    }, HINT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
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
