import type { PublicRoomState } from "@tunetrack/shared";
import type {
  GamePageCard,
  GamePagePlayerNameResolver,
} from "../GamePage.types";
import {
  getGamePageChallengeStatusState,
  type GamePageChallengeStatusSelectorResult,
} from "../gamePageStatusSelectors";

interface UseGamePageChallengeStatusStateOptions {
  canSelectChallengeSlot: boolean;
  challengeOwnerId: string | null | undefined;
  challengeSuccessCelebrationCard: GamePageCard | null;
  currentPlayerId: string | null;
  getPlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
}

export function useGamePageChallengeStatusState({
  canSelectChallengeSlot,
  challengeOwnerId,
  challengeSuccessCelebrationCard,
  currentPlayerId,
  getPlayerName,
  isCurrentPlayerTurn,
  nowEpochMs,
  roomState,
}: UseGamePageChallengeStatusStateOptions): GamePageChallengeStatusSelectorResult {
  return getGamePageChallengeStatusState({
    canSelectChallengeSlot,
    challengeOwnerId,
    challengeSuccessCelebrationCard,
    currentPlayerId,
    getPlayerName,
    isCurrentPlayerTurn,
    nowEpochMs,
    roomState,
  });
}
