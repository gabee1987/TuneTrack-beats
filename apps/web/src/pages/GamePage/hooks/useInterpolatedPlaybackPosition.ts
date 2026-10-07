import { useEffect, useState } from "react";
import type { HostPlaybackProgress } from "./HostPlaybackProvider";

const PROGRESS_TICK_MS = 1000;

function isDocumentVisible(): boolean {
  return document.visibilityState === "visible";
}

/**
 * Advances the playback position between player snapshots. Only the open playback tab calls
 * this, and it ticks only while playing and visible, so a closed menu or a backgrounded
 * host costs no timer and no commits (05 §2.2).
 */
export function useInterpolatedPlaybackPosition({
  duration,
  isPlaying,
  position,
  positionUpdatedAtMs,
}: HostPlaybackProgress): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isVisible, setIsVisible] = useState(isDocumentVisible);

  useEffect(() => {
    function handleVisibilityChange() {
      setIsVisible(isDocumentVisible());
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !isVisible) {
      return;
    }

    const intervalId = window.setInterval(() => setNowMs(Date.now()), PROGRESS_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, isVisible]);

  if (!isPlaying) {
    return position;
  }

  return Math.min(position + Math.max(0, nowMs - positionUpdatedAtMs), duration);
}
