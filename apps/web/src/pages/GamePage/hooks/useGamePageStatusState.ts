import type { PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
} from "../GamePage.types";

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
  function getChallengeCountdownLabel(): string | null {
    const deadlineEpochMs = roomState?.challengeState?.challengeDeadlineEpochMs;

    if (
      !deadlineEpochMs ||
      roomState?.status !== "challenge" ||
      roomState.challengeState?.phase !== "open"
    ) {
      return null;
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((deadlineEpochMs - nowEpochMs) / 1000),
    );

    return `${remainingSeconds}s left to call Beat!`;
  }

  function getActiveTimelineHint(): string {
    if (roomState?.status !== "challenge") {
      return isCurrentPlayerTurn
        ? "Tap a slot to preview your decision directly in the timeline, then confirm it."
        : "This is the timeline being judged on this turn.";
    }

    if (canSelectChallengeSlot) {
      return `You called Beat! Pick the slot where the card should have gone in ${getPossessivePlayerName(activePlayerId)} timeline.`;
    }

    if (isCurrentPlayerTurn) {
      return "Challenge window is open. Other players can decide whether to use Beat! against your choice.";
    }

    if (roomState.challengeState?.phase === "claimed") {
      return `${getPlayerName(challengeOwnerId)} claimed Beat! first and is choosing the challenge slot now.`;
    }

    return `${getPlayerName(roomState.challengeState?.originalPlayerId)} chose a slot. If you think it is wrong, press Beat! before the window ends.`;
  }

  function getStatusBadgeText(): string {
    if (roomState?.winnerPlayerId) {
      return "Game finished";
    }

    switch (roomState?.status) {
      case "turn":
        return isCurrentPlayerTurn
          ? "Your turn"
          : `${getPlayerName(activePlayerId)}'s turn`;
      case "challenge":
        if (roomState.challengeState?.originalPlayerId === currentPlayerId) {
          return "Your placement is under Beat!";
        }

        return roomState.challengeState?.phase === "claimed"
          ? `${getPlayerName(challengeOwnerId)} owns Beat!`
          : "Beat! window is open";
      case "reveal":
        return "Reveal";
      default:
        return "Game room";
    }
  }

  function getStatusDetailText(): string {
    if (roomState?.winnerPlayerId) {
      return `${getPlayerName(roomState.winnerPlayerId)} reached the win target first.`;
    }

    switch (roomState?.status) {
      case "turn":
        return isCurrentPlayerTurn
          ? "Choose a slot in your timeline, then confirm your placement."
          : `${getPlayerName(activePlayerId)} is deciding where the current song belongs.`;
      case "challenge":
        if (roomState.challengeState?.phase === "claimed") {
          return roomState.challengeState.challengerPlayerId === currentPlayerId
            ? "You claimed Beat! Choose the slot you believe is correct."
            : `${getPlayerName(challengeOwnerId)} claimed Beat! and is placing the answer now.`;
        }

        return isCurrentPlayerTurn
          ? "Your placement is locked while other players decide whether to challenge it."
          : `Beat! is open against ${getPossessivePlayerName(
              roomState.challengeState?.originalPlayerId,
            )} placement.`;
      case "reveal":
        return "Check the result, then wait for the allowed player to confirm reveal.";
      default:
        return "The room is in sync and ready.";
    }
  }

  function getChallengeActionTitle(): string | null {
    if (roomState?.status !== "challenge" || !roomState.challengeState) {
      return null;
    }

    if (roomState.challengeState.phase === "open") {
      return isCurrentPlayerTurn ? "Challenge window open" : "Beat available";
    }

    return challengeOwnerId === currentPlayerId
      ? "Place your Beat"
      : `${getPlayerName(challengeOwnerId)} is placing Beat`;
  }

  function getChallengeActionBody(): string | null {
    if (roomState?.status !== "challenge" || !roomState.challengeState) {
      return null;
    }

    if (roomState.challengeState.phase === "open") {
      return isCurrentPlayerTurn
        ? "Other players can still challenge this placement."
        : `Chosen slot: ${roomState.challengeState.originalSelectedSlotIndex}`;
    }

    return canSelectChallengeSlot
      ? "Choose the slot you believe is right, then confirm."
      : "Waiting for the challenge placement.";
  }

  function getChallengeMarkerTone(): ChallengeMarkerTone {
    if (
      roomState?.status !== "reveal" ||
      !roomState.revealState?.challengerPlayerId
    ) {
      return "pending";
    }

    return roomState.revealState.challengeWasSuccessful
      ? "success"
      : "failure";
  }

  function getChallengeSuccessMessage(): string | null {
    return challengeSuccessCelebrationCard ? "Clean Beat!" : null;
  }

  return {
    activeTimelineHint: getActiveTimelineHint(),
    challengeActionBody: getChallengeActionBody(),
    challengeActionTitle: getChallengeActionTitle(),
    challengeCountdownLabel: getChallengeCountdownLabel(),
    challengeMarkerTone: getChallengeMarkerTone(),
    challengeSuccessMessage: getChallengeSuccessMessage(),
    statusBadgeText: getStatusBadgeText(),
    statusDetailText: getStatusDetailText(),
  };
}
