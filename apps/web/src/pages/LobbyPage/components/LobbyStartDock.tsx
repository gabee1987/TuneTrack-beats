import { useState } from "react";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import { useI18n } from "../../../features/i18n";
import { ReadyTransition } from "../../../features/motion";
import { getConnectionProblemLabelKey } from "../../../features/rooms/connectionStatusLabel";
import { classNames } from "../../../features/ui/classNames";
import { Button } from "../../../features/ui/primitives";
import type { StartGameActionStatus } from "../LobbyPage.types";
import type { LobbySetupModel, LobbyStartNote, LobbyStartReason } from "../hooks/lobbySetupModel";
import { getShortDeckText } from "./LobbyDeckMeter";
import styles from "./LobbyStartDock.module.css";

type Translate = (key: string, params?: Record<string, string | number>) => string;
type StartModel = LobbySetupModel["start"];

interface LobbyStartDockProps {
  isHintEligible: boolean;
  onIntentToStart: () => void;
  onStart: () => void;
  start: StartModel;
  startGameActionStatus: StartGameActionStatus;
  /** The id of `LobbyStartSummary`'s line, which says why Start waits or what to expect. */
  summaryLineId: string;
}

/** The one primary action of the host lobby: only the button, so the dock stays slim (`22` §4.10). */
export function LobbyStartDock({
  isHintEligible,
  onIntentToStart,
  onStart,
  start,
  startGameActionStatus,
  summaryLineId,
}: LobbyStartDockProps) {
  const { t } = useI18n();
  const [hintAnchor, setHintAnchor] = useState<HTMLElement | null>(null);
  const hasLine = getStartLine(start, t) !== null;

  return (
    <div ref={setHintAnchor}>
      <ReadyTransition isReady={!start.isBlocked}>
        <Button
          aria-describedby={hasLine ? summaryLineId : undefined}
          disabled={start.isBlocked}
          fullWidth
          haptic
          onClick={onStart}
          onFocus={onIntentToStart}
          onMouseEnter={onIntentToStart}
          onTouchStart={onIntentToStart}
          size="lg"
        >
          {startGameActionStatus === "failed"
            ? t("lobby.startGame.retry")
            : t("lobby.start.action")}
        </Button>
      </ReadyTransition>
      <FirstRunHint anchor={hintAnchor} id="lobby-start" isEligible={isHintEligible} />
    </div>
  );
}

/** Where the room stands, at the end of the page: players and songs, then why Start waits. */
export function LobbyStartSummary({ lineId, start }: { lineId: string; start: StartModel }) {
  const { t } = useI18n();
  const line = getStartLine(start, t);
  const isWarning = !start.reason && isWarningNote(start.note);

  return (
    <div className={styles.summary}>
      <p className={styles.readiness}>
        {start.songCount === null
          ? t("lobby.start.readinessNoSongs", { players: start.playerCount })
          : t("lobby.start.readiness", { players: start.playerCount, songs: start.songCount })}
      </p>
      {line ? (
        <p className={classNames(styles.line, isWarning ? styles.warning : undefined)} id={lineId}>
          {line}
        </p>
      ) : null}
    </div>
  );
}

function getStartLine(start: StartModel, t: Translate): string | null {
  return start.reason ? getReasonText(start.reason, t) : getNoteText(start.note, t);
}

function getReasonText(reason: LobbyStartReason, t: Translate): string {
  switch (reason.kind) {
    case "connection":
      return t(getConnectionProblemLabelKey(reason.status) ?? "room.connection.reconnecting");
    case "creating":
      return t("lobby.start.reason.creating");
    case "noDeck":
      return t("lobby.start.reason.noDeck");
    case "pending":
      return t("lobby.startGame.pending");
    case "retrying":
      return t("lobby.startGame.retrying");
  }
}

function getNoteText(note: LobbyStartNote | null, t: Translate): string | null {
  switch (note?.kind) {
    case undefined:
      return null;
    case "noAudio":
      return t("lobby.start.note.noAudio");
    case "shortDeck":
      return getShortDeckText(note.meter, t);
    case "solo":
      return t("lobby.start.note.solo");
  }
}

function isWarningNote(note: LobbyStartNote | null): boolean {
  return note?.kind === "noAudio" || note?.kind === "shortDeck";
}
