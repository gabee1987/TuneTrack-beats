import type { PublicRoomState } from "@tunetrack/shared";
import styles from "./GamePageActionPanels.module.css";
import {
  ActionDock,
  PrimaryActionButton,
  SecondaryActionButton,
} from "./ActionDock";

interface ChallengeActionPanelProps {
  canClaimChallenge: boolean;
  canConfirmBeatPlacement: boolean;
  canResolveChallengeWindow: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  currentPlayerTtCount: number;
  handleClaimChallenge: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  roomState: PublicRoomState;
}

export function ChallengeActionPanel({
  canClaimChallenge,
  canConfirmBeatPlacement,
  canResolveChallengeWindow,
  challengeActionBody,
  challengeActionTitle,
  challengeCountdownLabel,
  currentPlayerTtCount,
  handleClaimChallenge,
  handlePlaceChallenge,
  handleResolveChallengeWindow,
  roomState,
}: ChallengeActionPanelProps) {
  if (roomState.status !== "challenge" || !roomState.challengeState) {
    return null;
  }

  const challengeStatusText = challengeCountdownLabel
    ? challengeCountdownLabel
    : roomState.challengeState.phase === "claimed"
      ? "Beat! was claimed. Waiting for the placement."
      : "Host resolves this window manually";

  return (
    <section className={styles.actionRail}>
      <div className={styles.actionRailHeader}>
        <div>
          <h3 className={styles.actionRailTitle}>{challengeActionTitle}</h3>
          {challengeActionBody ? (
            <p className={styles.actionRailText}>{challengeActionBody}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.challengeMetaRow}>
        <span className={styles.challengeChip}>
          Chosen slot: {roomState.challengeState.originalSelectedSlotIndex}
        </span>
        {roomState.settings.ttModeEnabled ? (
          <span className={styles.challengeChip}>
            Your TT: {currentPlayerTtCount}
          </span>
        ) : null}
        <span className={styles.challengeChip}>{challengeStatusText}</span>
      </div>

      {roomState.challengeState.phase === "open" ? (
        canClaimChallenge || canResolveChallengeWindow ? (
          <ActionDock>
            {canClaimChallenge ? (
              <PrimaryActionButton onClick={handleClaimChallenge}>
                Beat!
              </PrimaryActionButton>
            ) : null}
            {canResolveChallengeWindow ? (
              <SecondaryActionButton onClick={handleResolveChallengeWindow}>
                Resolve
              </SecondaryActionButton>
            ) : null}
          </ActionDock>
        ) : null
      ) : canConfirmBeatPlacement ? (
        <ActionDock>
          <PrimaryActionButton onClick={handlePlaceChallenge}>
            Confirm Beat
          </PrimaryActionButton>
        </ActionDock>
      ) : null}
    </section>
  );
}
