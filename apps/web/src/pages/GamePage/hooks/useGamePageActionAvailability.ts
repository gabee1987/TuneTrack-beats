import type { PublicRoomState } from "@tunetrack/shared";

interface UseGamePageActionAvailabilityOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useGamePageActionAvailability({
  currentPlayerId,
  roomState,
}: UseGamePageActionAvailabilityOptions) {
  const isHost = roomState?.hostId === currentPlayerId;
  const isCurrentPlayerTurn =
    Boolean(currentPlayerId) &&
    roomState?.turn?.activePlayerId === currentPlayerId;
  const isChallengeOwner =
    Boolean(currentPlayerId) &&
    roomState?.challengeState?.challengerPlayerId === currentPlayerId;
  const canSelectChallengeSlot =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "claimed" &&
    isChallengeOwner;
  const canClaimChallenge =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    !isCurrentPlayerTurn &&
    roomState.challengeState.originalPlayerId !== currentPlayerId;
  const canResolveChallengeWindow =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    (roomState.settings.revealConfirmMode === "host_or_active_player"
      ? isCurrentPlayerTurn || roomState.hostId === currentPlayerId
      : roomState.hostId === currentPlayerId);
  const canConfirmReveal =
    roomState?.status === "reveal" &&
    (roomState.settings.revealConfirmMode === "host_or_active_player"
      ? isCurrentPlayerTurn || roomState.hostId === currentPlayerId
      : roomState.hostId === currentPlayerId);

  const activePlayer = roomState?.turn?.activePlayerId
    ? roomState.players.find((player) => player.id === roomState.turn?.activePlayerId)
    : null;
  const challengerPlayer =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "claimed" &&
    roomState.challengeState.challengerPlayerId
      ? roomState.players.find((p) => p.id === roomState.challengeState?.challengerPlayerId)
      : null;
  const canSkipOfflinePlayer =
    isHost &&
    (
      (roomState?.status === "turn" && activePlayer?.connectionStatus === "disconnected") ||
      (roomState?.status === "challenge" &&
        roomState.challengeState?.phase === "claimed" &&
        challengerPlayer?.connectionStatus === "disconnected")
    );

  return {
    canClaimChallenge,
    canConfirmReveal,
    canResolveChallengeWindow,
    canSelectChallengeSlot,
    canSkipOfflinePlayer,
    isChallengeOwner,
    isCurrentPlayerTurn,
    isHost,
  };
}
