import type { PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
} from "./GamePage.types";

interface GamePageChallengeStatusSelectorOptions {
  canSelectChallengeSlot: boolean;
  challengeOwnerId: string | null | undefined;
  challengeSuccessCelebrationCard: GamePageCard | null;
  currentPlayerId: string | null;
  getPlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
}

interface GamePageStatusCopySelectorOptions {
  activePlayerId: string | null | undefined;
  challengeOwnerId: string | null | undefined;
  currentPlayerId: string | null;
  canSelectChallengeSlot: boolean;
  getPlayerName: GamePagePlayerNameResolver;
  getPossessivePlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  roomState: PublicRoomState | null;
}

export interface GamePageChallengeStatusSelectorResult {
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  challengeSuccessMessage: string | null;
}

export interface GamePageStatusCopySelectorResult {
  activeTimelineHint: string;
  statusBadgeText: string;
  statusDetailText: string;
}

export function getGamePageChallengeStatusState({
  canSelectChallengeSlot,
  challengeOwnerId,
  challengeSuccessCelebrationCard,
  currentPlayerId,
  getPlayerName,
  isCurrentPlayerTurn,
  nowEpochMs,
  roomState,
}: GamePageChallengeStatusSelectorOptions): GamePageChallengeStatusSelectorResult {
  const deadlineEpochMs = roomState?.challengeState?.challengeDeadlineEpochMs;
  const challengeCountdownLabel =
    !deadlineEpochMs ||
    roomState?.status !== "challenge" ||
    roomState.challengeState?.phase !== "open"
      ? null
      : `${Math.max(0, Math.ceil((deadlineEpochMs - nowEpochMs) / 1000))}s left to call Beat!`;

  const challengeActionTitle =
    roomState?.status !== "challenge" || !roomState.challengeState
      ? null
      : roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? "Challenge window open"
          : "Beat available"
        : challengeOwnerId === currentPlayerId
          ? "Place your Beat"
          : `${getPlayerName(challengeOwnerId)} is placing Beat`;

  const challengeActionBody =
    roomState?.status !== "challenge" || !roomState.challengeState
      ? null
      : roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? "Other players can still challenge this placement."
          : `Chosen slot: ${roomState.challengeState.originalSelectedSlotIndex}`
        : canSelectChallengeSlot
          ? "Choose the slot you believe is right, then confirm."
          : "Waiting for the challenge placement.";

  const challengeMarkerTone: ChallengeMarkerTone =
    roomState?.status !== "reveal" || !roomState.revealState?.challengerPlayerId
      ? "pending"
      : roomState.revealState.challengeWasSuccessful
        ? "success"
        : "failure";

  return {
    challengeActionBody,
    challengeActionTitle,
    challengeCountdownLabel,
    challengeMarkerTone,
    challengeSuccessMessage: challengeSuccessCelebrationCard
      ? "Clean Beat!"
      : null,
  };
}

export function getGamePageStatusCopyState({
  activePlayerId,
  challengeOwnerId,
  currentPlayerId,
  canSelectChallengeSlot,
  getPlayerName,
  getPossessivePlayerName,
  isCurrentPlayerTurn,
  roomState,
}: GamePageStatusCopySelectorOptions): GamePageStatusCopySelectorResult {
  const activeTimelineHint =
    roomState?.status !== "challenge"
      ? isCurrentPlayerTurn
        ? "Tap a slot to preview your decision directly in the timeline, then confirm it."
        : "This is the timeline being judged on this turn."
      : canSelectChallengeSlot
        ? `You called Beat! Pick the slot where the card should have gone in ${getPossessivePlayerName(activePlayerId)} timeline.`
        : isCurrentPlayerTurn
          ? "Challenge window is open. Other players can decide whether to use Beat! against your choice."
          : roomState.challengeState?.phase === "claimed"
            ? `${getPlayerName(challengeOwnerId)} claimed Beat! first and is choosing the challenge slot now.`
            : `${getPlayerName(roomState.challengeState?.originalPlayerId)} chose a slot. If you think it is wrong, press Beat! before the window ends.`;

  const statusBadgeText = roomState?.winnerPlayerId
    ? "Game finished"
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? "Your turn"
        : `${getPlayerName(activePlayerId)}'s turn`
      : roomState?.status === "challenge"
        ? roomState.challengeState?.originalPlayerId === currentPlayerId
          ? "Your placement is under Beat!"
          : roomState.challengeState?.phase === "claimed"
            ? `${getPlayerName(challengeOwnerId)} owns Beat!`
            : "Beat! window is open"
        : roomState?.status === "reveal"
          ? "Reveal"
          : "Game room";

  const statusDetailText = roomState?.winnerPlayerId
    ? `${getPlayerName(roomState.winnerPlayerId)} reached the win target first.`
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? "Choose a slot in your timeline, then confirm your placement."
        : `${getPlayerName(activePlayerId)} is deciding where the current song belongs.`
      : roomState?.status === "challenge"
        ? roomState.challengeState?.phase === "claimed"
          ? roomState.challengeState.challengerPlayerId === currentPlayerId
            ? "You claimed Beat! Choose the slot you believe is correct."
            : `${getPlayerName(challengeOwnerId)} claimed Beat! and is placing the answer now.`
          : isCurrentPlayerTurn
            ? "Your placement is locked while other players decide whether to challenge it."
            : `Beat! is open against ${getPossessivePlayerName(
                roomState.challengeState?.originalPlayerId,
              )} placement.`
        : roomState?.status === "reveal"
          ? "Check the result, then wait for the allowed player to confirm reveal."
          : "The room is in sync and ready.";

  return {
    activeTimelineHint,
    statusBadgeText,
    statusDetailText,
  };
}
