import { useEffect, useState, type MouseEvent } from "react";
import { useI18n } from "../../../features/i18n";
import { Button, Chip } from "../../../features/ui/primitives";
import type { HostPlaybackNotice } from "../handoverNotices";
import { useHostPlaybackControls } from "../hooks/HostPlaybackProvider";

export const PRACTICE_NOTICE_DURATION_MS = 4000;

interface HostPlaybackChipProps {
  notice: HostPlaybackNotice;
}

/**
 * The host's own playback in the header (`22` §4.11): connecting, a tap to start a blocked song,
 * or, with the practice deck, one short note that this round is silent.
 */
export function HostPlaybackChip({ notice }: HostPlaybackChipProps) {
  const { isReady, needsUserGesture, restart, unlockPlayback } = useHostPlaybackControls();
  const [isPracticeNoteVisible, setIsPracticeNoteVisible] = useState(notice === "practice");

  useEffect(() => {
    if (notice !== "practice") return;
    const timer = window.setTimeout(
      () => setIsPracticeNoteVisible(false),
      PRACTICE_NOTICE_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  // A pointer tap already starts the song through the provider's capture listener; only a
  // keyboard press (detail 0) reaches the button without it, so only that one restarts here.
  function handleStart(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail !== 0) return;
    unlockPlayback();
    restart();
  }

  const kind = getNoticeKind(notice, isPracticeNoteVisible, isReady, needsUserGesture);
  return <PlaybackNoticeChip kind={kind} onStart={handleStart} />;
}

function getNoticeKind(
  notice: HostPlaybackNotice,
  isPracticeNoteVisible: boolean,
  isReady: boolean,
  needsUserGesture: boolean,
): PlaybackNoticeKind | null {
  if (notice === "practice") return isPracticeNoteVisible ? "practice" : null;
  if (notice !== "owner") return null;
  if (!isReady) return "connecting";
  return needsUserGesture ? "tapToStart" : null;
}

export type PlaybackNoticeKind = "connecting" | "practice" | "tapToStart";

interface PlaybackNoticeChipProps {
  kind: PlaybackNoticeKind | null;
  onStart: (event: MouseEvent<HTMLButtonElement>) => void;
}

/** How each playback notice looks; `HostPlaybackChip` decides which one applies. */
export function PlaybackNoticeChip({ kind, onStart }: PlaybackNoticeChipProps) {
  const { t } = useI18n();

  switch (kind) {
    case "connecting":
      return <Chip role="status">{t("game.playback.connecting")}</Chip>;
    case "practice":
      return <Chip>{t("game.playback.practice")}</Chip>;
    case "tapToStart":
      return (
        <Button onClick={onStart} size="md" variant="primary">
          {t("game.playback.tapToStart")}
        </Button>
      );
    default:
      return null;
  }
}
