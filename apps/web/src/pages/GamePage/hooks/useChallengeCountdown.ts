import { useEffect, useState } from "react";
import { useI18n } from "../../../features/i18n";
import {
  formatChallengeCountdownLabel,
  getChallengeSecondsRemaining,
} from "../gamePageChallengeCountdown";

interface ChallengeCountdown {
  label: string;
  secondsRemaining: number;
}

/** The Beat! window countdown, ticking while `enabled` and a deadline is set; null otherwise. */
export function useChallengeCountdown(
  deadlineEpochMs: number | null,
  enabled: boolean,
): ChallengeCountdown | null {
  const { t } = useI18n();
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !deadlineEpochMs) {
      return;
    }

    setNowEpochMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowEpochMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deadlineEpochMs, enabled]);

  if (!enabled || !deadlineEpochMs) {
    return null;
  }

  return {
    label: formatChallengeCountdownLabel(deadlineEpochMs, nowEpochMs, t)!,
    secondsRemaining: getChallengeSecondsRemaining(deadlineEpochMs, nowEpochMs),
  };
}
