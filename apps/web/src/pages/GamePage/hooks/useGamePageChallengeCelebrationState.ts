import type { PublicRoomState } from "@tunetrack/shared";

interface UseGamePageChallengeCelebrationStateOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

interface UseGamePageChallengeCelebrationStateResult {
  challengeSuccessCelebrationCard: PublicRoomState["currentTrackCard"] | null;
  challengeSuccessCelebrationKey: string | null;
}

export function useGamePageChallengeCelebrationState({
  currentPlayerId,
  roomState,
}: UseGamePageChallengeCelebrationStateOptions): UseGamePageChallengeCelebrationStateResult {
  if (
    roomState?.status !== "reveal" ||
    roomState.revealState?.challengerPlayerId !== currentPlayerId ||
    !roomState.revealState.challengeWasSuccessful
  ) {
    return {
      challengeSuccessCelebrationCard: null,
      challengeSuccessCelebrationKey: null,
    };
  }

  return {
    challengeSuccessCelebrationCard: roomState.revealState.placedCard,
    challengeSuccessCelebrationKey: [
      roomState.roomId,
      roomState.turn?.turnNumber ?? "reveal",
      roomState.revealState.playerId,
      roomState.revealState.placedCard.id,
      roomState.revealState.challengerSelectedSlotIndex ?? "challenge",
    ].join(":"),
  };
}
