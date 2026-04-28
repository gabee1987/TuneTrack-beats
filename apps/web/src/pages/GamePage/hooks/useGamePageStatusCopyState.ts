import type { PublicRoomState } from "@tunetrack/shared";
import type { GamePagePlayerNameResolver } from "../GamePage.types";
import { useI18n } from "../../../features/i18n";
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
  const { t } = useI18n();

  return getGamePageStatusCopyState({
    activePlayerId,
    challengeOwnerId,
    currentPlayerId,
    canSelectChallengeSlot,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn,
    roomState,
    t,
  });
}
