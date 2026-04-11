import type { PublicRoomState } from "@tunetrack/shared";
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
        <SecondaryActionButton onClick={handleSkipTrackWithTt}>
          Skip
        </SecondaryActionButton>
      ) : null}
      {canUseBuyCard ? (
        <SecondaryActionButton onClick={handleBuyTimelineCardWithTt}>
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
