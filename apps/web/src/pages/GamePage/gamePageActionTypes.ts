/** One status per acknowledged game action; see `hooks/actions/useAckedAction`. */
type ActionStatus = "idle" | "pending" | "retrying" | "failed";
type ActiveActionStatus = Exclude<ActionStatus, "idle">;

export type PlaceCardActionStatus = ActionStatus;
export type ConfirmRevealActionStatus = ActionStatus;
export type ClaimChallengeActionStatus = ActionStatus;
export type PlaceChallengeActionStatus = ActionStatus;
export type ResolveChallengeWindowActionStatus = ActionStatus;
export type CloseRoomActionStatus = ActionStatus;
export type BuyTimelineCardActionStatus = ActionStatus;
export type SkipTrackActionStatus = ActionStatus;
export type SkipTurnActionStatus = ActionStatus;
export type AwardTtActionStatus = ActiveActionStatus;
export type TransferHostActionStatus = ActiveActionStatus;
export type KickPlayerActionStatus = ActiveActionStatus;

export interface AwardTtActionState {
  amount: 1 | -1;
  playerId: string;
  status: AwardTtActionStatus;
}

export interface TransferHostActionState {
  playerId: string;
  status: TransferHostActionStatus;
}

export interface KickPlayerActionState {
  playerId: string;
  status: KickPlayerActionStatus;
}

export interface GamePageActionHandlers {
  handleBuyTimelineCardWithTt: () => void;
  handleClaimChallenge: () => void;
  handleCloseRoom: () => void;
  handleConfirmReveal: () => void;
  handlePlaceCard: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  handleSkipTrackWithTt: () => void;
  handleSkipTurn: () => void;
}
