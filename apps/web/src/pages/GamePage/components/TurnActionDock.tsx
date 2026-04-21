import {
  BUY_TIMELINE_CARD_TT_COST,
  SKIP_TRACK_TT_COST,
  type PublicRoomState,
} from "@tunetrack/shared";
import {
  ActionDock,
  PrimaryActionButton,
  SecondaryActionButton,
} from "./ActionDock";

interface TurnActionDockProps {
  canConfirmTurnPlacement: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  handleBuyTimelineCardWithTt: () => void;
  handlePlaceCard: () => void;
  handleSkipTrackWithTt: () => void;
  roomState: PublicRoomState;
}

export function TurnActionDock({
  canConfirmTurnPlacement,
  canUseBuyCard,
  canUseSkipTrack,
  handleBuyTimelineCardWithTt,
  handlePlaceCard,
  handleSkipTrackWithTt,
  roomState,
}: TurnActionDockProps) {
  if (
    roomState.status !== "turn" ||
    (!canUseSkipTrack && !canUseBuyCard && !canConfirmTurnPlacement)
  ) {
    return null;
  }

  return (
    <ActionDock>
      {canUseSkipTrack ? (
        <SecondaryActionButton
          onClick={handleSkipTrackWithTt}
          ttCost={SKIP_TRACK_TT_COST}
        >
          Skip
        </SecondaryActionButton>
      ) : null}
      {canUseBuyCard ? (
        <SecondaryActionButton
          onClick={handleBuyTimelineCardWithTt}
          ttCost={BUY_TIMELINE_CARD_TT_COST}
        >
          Buy
        </SecondaryActionButton>
      ) : null}
      {canConfirmTurnPlacement ? (
        <PrimaryActionButton onClick={handlePlaceCard}>
          Confirm
        </PrimaryActionButton>
      ) : null}
    </ActionDock>
  );
}
