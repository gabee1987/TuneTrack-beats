import type { PublicRoomState } from "@tunetrack/shared/client";
import { useState } from "react";
import { useI18n } from "../../../features/i18n";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import type {
  BuyTimelineCardActionStatus,
  PlaceCardActionStatus,
  SkipTrackActionStatus,
  SkipTurnActionStatus,
} from "../GamePage.types";
import { ActionDock, SecondaryActionButton } from "./ActionDock";
import dockStyles from "./gamePageActionPanelsDock.module.css";
import { ConfirmPlacementAction } from "./turnActions/ConfirmPlacementAction";
import { OfflinePlayerPanel } from "./turnActions/OfflinePlayerPanel";
import type { TokenSpendAnimationStart } from "./tokenSpendOrigin";
import { BuyCardAction, SkipTrackAction } from "./turnActions/TtSpendActions";
import { TurnActionSlot } from "./turnActions/TurnActionSlot";

interface TurnActionDockProps {
  buyTimelineCardActionStatus: BuyTimelineCardActionStatus;
  canConfirmTurnPlacement: boolean;
  canSkipOfflinePlayer: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  handleBuyTimelineCardWithTt: () => void;
  handlePlaceCard: () => void;
  handleSkipOfflinePlayer: () => void;
  handleSkipTrackWithTt: () => void;
  isBuyTimelineCardPending: boolean;
  isPlaceCardPending: boolean;
  isSkipTrackPending: boolean;
  isSkipTurnPending: boolean;
  placeCardActionStatus: PlaceCardActionStatus;
  onTokenSpendAnimationStart?: TokenSpendAnimationStart;
  /** The player a host may skip: the claimed challenger, else the active player. */
  skipCandidateName: string | null;
  skipTrackActionStatus: SkipTrackActionStatus;
  skipTurnActionStatus: SkipTurnActionStatus;
  status: PublicRoomState["status"];
  turnSkipDeadlineEpochMs: number | null;
}

const SKIP_TURN_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.skipTurn",
  pending: "game.controls.skipTurn",
  retrying: "game.controls.skipTurnRetrying",
  failed: "game.controls.retrySkipTurn",
} as const;

export function TurnActionDock({
  buyTimelineCardActionStatus,
  canConfirmTurnPlacement,
  canSkipOfflinePlayer,
  canUseBuyCard,
  canUseSkipTrack,
  handleBuyTimelineCardWithTt,
  handlePlaceCard,
  handleSkipOfflinePlayer,
  handleSkipTrackWithTt,
  isBuyTimelineCardPending,
  isPlaceCardPending,
  isSkipTrackPending,
  isSkipTurnPending,
  placeCardActionStatus,
  onTokenSpendAnimationStart,
  skipCandidateName,
  skipTrackActionStatus,
  skipTurnActionStatus,
  status,
  turnSkipDeadlineEpochMs,
}: TurnActionDockProps) {
  const { t } = useI18n();
  const [confirmHintAnchor, setConfirmHintAnchor] = useState<HTMLElement | null>(null);

  const isChallengePhaseSkip = status === "challenge" && canSkipOfflinePlayer;
  if (status !== "turn" && !isChallengePhaseSkip) {
    return null;
  }
  if (
    status === "turn" &&
    !canUseSkipTrack &&
    !canUseBuyCard &&
    !canConfirmTurnPlacement &&
    !canSkipOfflinePlayer
  ) {
    return null;
  }
  // Only the player's own turn can show token actions and the confirm button together.
  const isStacked =
    status === "turn" && canConfirmTurnPlacement && (canUseSkipTrack || canUseBuyCard);

  const skipTrackAction = (
    <SkipTrackAction
      actionStatus={skipTrackActionStatus}
      handleSkipTrackWithTt={handleSkipTrackWithTt}
      isAvailable={canUseSkipTrack}
      isPending={isSkipTrackPending}
      onTokenSpendAnimationStart={onTokenSpendAnimationStart}
    />
  );
  const buyCardAction = canUseBuyCard ? (
    <BuyCardAction
      actionStatus={buyTimelineCardActionStatus}
      handleBuyTimelineCardWithTt={handleBuyTimelineCardWithTt}
      isPending={isBuyTimelineCardPending}
      onTokenSpendAnimationStart={onTokenSpendAnimationStart}
    />
  ) : null;
  const confirmPlacementAction = canConfirmTurnPlacement ? (
    <ConfirmPlacementAction
      actionStatus={placeCardActionStatus}
      handlePlaceCard={handlePlaceCard}
      isFullWidth={isStacked}
      isPending={isPlaceCardPending}
    />
  ) : null;
  const skipOfflinePlayerAction = canSkipOfflinePlayer ? (
    <TurnActionSlot>
      <SecondaryActionButton disabled={isSkipTurnPending} onClick={() => handleSkipOfflinePlayer()}>
        {t(SKIP_TURN_LABEL_KEY_BY_STATUS[skipTurnActionStatus])}
      </SecondaryActionButton>
    </TurnActionSlot>
  ) : null;

  return (
    <>
      {canSkipOfflinePlayer ? (
        <OfflinePlayerPanel
          playerName={skipCandidateName ?? t("game.player.unknown")}
          turnSkipDeadlineEpochMs={turnSkipDeadlineEpochMs}
        />
      ) : null}
      <ActionDock
        className={isStacked ? dockStyles.floatingActionDockStacked : ""}
        containerRef={setConfirmHintAnchor}
      >
        {isStacked ? (
          <>
            <div className={dockStyles.floatingActionSecondaryRow}>
              {skipTrackAction}
              {buyCardAction}
            </div>
            {confirmPlacementAction}
          </>
        ) : (
          <>
            {skipTrackAction}
            {buyCardAction}
            {confirmPlacementAction}
            {skipOfflinePlayerAction}
          </>
        )}
      </ActionDock>
      <FirstRunHint
        anchor={confirmHintAnchor}
        id="game-confirm"
        isEligible={status === "turn" && canConfirmTurnPlacement}
      />
    </>
  );
}
