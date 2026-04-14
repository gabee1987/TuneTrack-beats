import type { PublicRoomState } from "@tunetrack/shared";
import type { GamePagePlayerNameResolver } from "../GamePage.types";
import {
  getGamePageStatusCopyState,
  type GamePageStatusCopySelectorResult,
} from "../gamePageStatusSelectors";

interface UseGamePageStatusCopyStateOptions {
  activePlayerId: string | null | undefined;
  challengeOwnerId: string | null | undefined;
  currentPlayerId: string | null;
  canSelectChallengeSlot: boolean;
  getPlayerName: GamePagePlayerNameResolver;
  getPossessivePlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  roomState: PublicRoomState | null;
}

export function useGamePageStatusCopyState({
  activePlayerId,
  challengeOwnerId,
  currentPlayerId,
  canSelectChallengeSlot,
  getPlayerName,
  getPossessivePlayerName,
  isCurrentPlayerTurn,
  roomState,
}: UseGamePageStatusCopyStateOptions): GamePageStatusCopySelectorResult {
  return getGamePageStatusCopyState({
    activePlayerId,
    challengeOwnerId,
    currentPlayerId,
    canSelectChallengeSlot,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn,
    roomState,
  });
}
