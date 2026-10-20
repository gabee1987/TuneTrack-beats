import { useEffect, useState } from "react";

/** Whole seconds left until the server's offline-player auto-skip, as "12s"; null when none. */
export function useTurnSkipCountdown(deadlineEpochMs: number | null): string | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (deadlineEpochMs === null) {
      setSecondsLeft(null);
      return;
    }

    function update() {
      const remaining = deadlineEpochMs! - Date.now();
      setSecondsLeft(remaining > 0 ? Math.ceil(remaining / 1000) : null);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadlineEpochMs]);

  return secondsLeft !== null ? `${secondsLeft}s` : null;
}
