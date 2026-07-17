import { useEffect, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { formatChallengeCountdownLabel } from "../gamePageChallengeCountdown";

export function useChallengeCountdownLabel(
  deadlineEpochMs: number | null,
  enabled: boolean,
): string | null {
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

  return formatChallengeCountdownLabel(deadlineEpochMs, nowEpochMs, t);
}
