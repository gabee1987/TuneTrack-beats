import type { PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
} from "../GamePage.types";
import { useGamePageChallengeStatusState } from "./useGamePageChallengeStatusState";
import { useGamePageStatusCopyState } from "./useGamePageStatusCopyState";

interface UseGamePageStatusStateOptions {
  activePlayerId: string | null | undefined;
  challengeOwnerId: string | null | undefined;
  currentPlayerId: string | null;
  canSelectChallengeSlot: boolean;
  challengeSuccessCelebrationCard: GamePageCard | null;
  getPlayerName: GamePagePlayerNameResolver;
  getPossessivePlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
}

interface UseGamePageStatusStateResult {
  activeTimelineHint: string;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  challengeSuccessMessage: string | null;
  statusBadgeText: string;
  statusDetailText: string;
}

export function useGamePageStatusState({
  activePlayerId,
  challengeOwnerId,
  currentPlayerId,
  canSelectChallengeSlot,
  challengeSuccessCelebrationCard,
  getPlayerName,
  getPossessivePlayerName,
  isCurrentPlayerTurn,
  nowEpochMs,
  roomState,
}: UseGamePageStatusStateOptions): UseGamePageStatusStateResult {
  const challengeStatusState = useGamePageChallengeStatusState({
    canSelectChallengeSlot,
    challengeOwnerId,
    challengeSuccessCelebrationCard,
    currentPlayerId,
    getPlayerName,
    isCurrentPlayerTurn,
    nowEpochMs,
    roomState,
  });

  const statusCopyState = useGamePageStatusCopyState({
    activePlayerId,
    challengeOwnerId,
    currentPlayerId,
    canSelectChallengeSlot,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn,
    roomState,
  });

  return {
    activeTimelineHint: statusCopyState.activeTimelineHint,
    challengeActionBody: challengeStatusState.challengeActionBody,
    challengeActionTitle: challengeStatusState.challengeActionTitle,
    challengeCountdownLabel: challengeStatusState.challengeCountdownLabel,
    challengeMarkerTone: challengeStatusState.challengeMarkerTone,
    challengeSuccessMessage: challengeStatusState.challengeSuccessMessage,
    statusBadgeText: statusCopyState.statusBadgeText,
    statusDetailText: statusCopyState.statusDetailText,
  };
}
