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
  const isManualChallengeWindow =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    !deadlineEpochMs;
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
          : isManualChallengeWindow
            ? "Beat available"
            : "Beat available"
        : challengeOwnerId === currentPlayerId
          ? "Place your Beat"
          : `${getPlayerName(challengeOwnerId)} is placing Beat`;

  const challengeActionBody =
    roomState?.status !== "challenge" || !roomState.challengeState
      ? null
      : roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? isManualChallengeWindow
            ? "Other players can still call Beat on this placement."
            : "Other players can still challenge this placement."
          : isManualChallengeWindow
            ? "Think it's wrong? Call Beat before the host closes the window."
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
  const isActivePlayerOffline =
    roomState?.status === "turn" &&
    roomState.players.find((p) => p.id === activePlayerId)?.connectionStatus === "disconnected";

  const activeTimelineHint =
    roomState?.status !== "challenge"
      ? isCurrentPlayerTurn
        ? ""
        : "This is the timeline being judged on this turn."
      : canSelectChallengeSlot
        ? `You called Beat! Pick the slot where the card should have gone in ${getPossessivePlayerName(activePlayerId)} timeline.`
        : isCurrentPlayerTurn
          ? roomState.challengeState?.challengeDeadlineEpochMs
            ? "Challenge window is open. Other players can decide whether to use Beat! against your choice."
            : "Challenge window is open. Other players can still call Beat until the host closes it."
          : roomState.challengeState?.phase === "claimed"
            ? `${getPlayerName(challengeOwnerId)} claimed Beat! first and is choosing the challenge slot now.`
            : roomState.challengeState?.challengeDeadlineEpochMs
              ? `${getPlayerName(roomState.challengeState?.originalPlayerId)} chose a slot. If you think it is wrong, press Beat! before the window ends.`
              : `${getPlayerName(roomState.challengeState?.originalPlayerId)} chose a slot. If you think it is wrong, press Beat! before the host closes the window.`;

  const statusBadgeText = roomState?.winnerPlayerId
    ? "Game finished"
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? "Your turn"
        : isActivePlayerOffline
          ? `${getPlayerName(activePlayerId)} is offline`
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
        ? ""
        : isActivePlayerOffline
          ? `${getPlayerName(activePlayerId)} is offline. Waiting for them to reconnect.`
          : `${getPlayerName(activePlayerId)} is deciding where the current song belongs.`
      : roomState?.status === "challenge"
        ? roomState.challengeState?.phase === "claimed"
          ? roomState.challengeState.challengerPlayerId === currentPlayerId
            ? "You claimed Beat! Choose the slot you believe is correct."
            : `${getPlayerName(challengeOwnerId)} claimed Beat! and is placing the answer now.`
          : isCurrentPlayerTurn
            ? roomState.challengeState?.challengeDeadlineEpochMs
              ? "Your placement is locked while other players decide whether to challenge it."
              : "Your placement is locked while the host waits for a Beat call or closes the window."
            : roomState.challengeState?.challengeDeadlineEpochMs
              ? `Beat! is open against ${getPossessivePlayerName(
                  roomState.challengeState?.originalPlayerId,
                )} placement.`
              : `Beat! is open against ${getPossessivePlayerName(
                  roomState.challengeState?.originalPlayerId,
                )} placement until the host closes the window.`
        : roomState?.status === "reveal"
          ? "Check the result, then wait for the allowed player to confirm reveal."
          : "The room is in sync and ready.";

  return {
    activeTimelineHint,
    statusBadgeText,
    statusDetailText,
  };
}
