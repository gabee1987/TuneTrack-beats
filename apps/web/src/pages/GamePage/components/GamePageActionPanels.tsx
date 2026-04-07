import type { PublicRoomState } from "@tunetrack/shared";
import styles from "../GamePage.module.css";

interface GamePageActionPanelsProps {
  canClaimChallenge: boolean;
  canConfirmBeatPlacement: boolean;
  canConfirmReveal: boolean;
  canConfirmTurnPlacement: boolean;
  canResolveChallengeWindow: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  currentPlayerTtCount: number;
  getPlayerName: (playerId: string | null | undefined) => string;
  handleBuyTimelineCardWithTt: () => void;
  handleClaimChallenge: () => void;
  handleConfirmReveal: () => void;
  handlePlaceCard: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  handleSkipTrackWithTt: () => void;
  roomState: PublicRoomState;
  showHelperLabels: boolean;
}

export function GamePageActionPanels({
  canClaimChallenge,
  canConfirmBeatPlacement,
  canConfirmReveal,
  canConfirmTurnPlacement,
  canResolveChallengeWindow,
  canUseBuyCard,
  canUseSkipTrack,
  challengeActionBody,
  challengeActionTitle,
  challengeCountdownLabel,
  currentPlayerTtCount,
  getPlayerName,
  handleBuyTimelineCardWithTt,
  handleClaimChallenge,
  handleConfirmReveal,
  handlePlaceCard,
  handlePlaceChallenge,
  handleResolveChallengeWindow,
  handleSkipTrackWithTt,
  roomState,
  showHelperLabels,
}: GamePageActionPanelsProps) {
  return (
    <>
      {roomState.status === "challenge" && roomState.challengeState ? (
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
            {challengeCountdownLabel ? (
              <span className={styles.challengeChip}>{challengeCountdownLabel}</span>
            ) : roomState.challengeState.phase === "claimed" ? (
              <span className={styles.challengeChip}>
                Beat! was claimed. Waiting for the placement.
              </span>
            ) : (
              <span className={styles.challengeChip}>
                Host resolves this window manually
              </span>
            )}
          </div>

          {roomState.challengeState.phase === "open" ? (
            <>
              {canClaimChallenge || canResolveChallengeWindow ? (
                <div className={styles.floatingActionDock}>
                  {canClaimChallenge ? (
                    <button
                      className={styles.floatingPrimaryButton}
                      onClick={handleClaimChallenge}
                      type="button"
                    >
                      Beat!
                    </button>
                  ) : null}
                  {canResolveChallengeWindow ? (
                    <button
                      className={styles.floatingSecondaryButton}
                      onClick={handleResolveChallengeWindow}
                      type="button"
                    >
                      Resolve
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : canConfirmBeatPlacement ? (
            <div className={styles.floatingActionDock}>
              <button
                className={styles.floatingPrimaryButton}
                onClick={handlePlaceChallenge}
                type="button"
              >
                Confirm Beat
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {roomState.status === "finished" ? (
        <section className={styles.revealPanel}>
          {showHelperLabels ? (
            <p className={styles.sectionLabel}>Game Over</p>
          ) : null}
          <h2 className={styles.cardTitle}>
            {getPlayerName(roomState.winnerPlayerId)} wins!
          </h2>
        </section>
      ) : null}

      {roomState.status === "reveal" && canConfirmReveal ? (
        <div className={styles.floatingActionDock}>
          <button
            className={styles.floatingPrimaryButton}
            onClick={handleConfirmReveal}
            type="button"
          >
            Confirm Reveal
          </button>
        </div>
      ) : null}

      {roomState.status === "turn" &&
      (canUseSkipTrack || canUseBuyCard || canConfirmTurnPlacement) ? (
        <div className={styles.floatingActionDock}>
          {canUseSkipTrack ? (
            <button
              className={styles.floatingSecondaryButton}
              onClick={handleSkipTrackWithTt}
              type="button"
            >
              Skip
            </button>
          ) : null}
          {canUseBuyCard ? (
            <button
              className={styles.floatingSecondaryButton}
              onClick={handleBuyTimelineCardWithTt}
              type="button"
            >
              Buy
            </button>
          ) : null}
          {canConfirmTurnPlacement ? (
            <button
              className={styles.floatingPrimaryButton}
              onClick={handlePlaceCard}
              type="button"
            >
              Confirm
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
