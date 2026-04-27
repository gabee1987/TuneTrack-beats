import type { PublicPlayerState, PublicRoomState } from "@tunetrack/shared";

export function buildDisconnectedRoomState(
  roomState: PublicRoomState,
  playerId: string,
  disconnectedAtEpochMs: number,
  reconnectExpiresAtEpochMs: number,
): PublicRoomState {
  return {
    ...roomState,
    players: roomState.players.map((player) =>
      player.id === playerId
        ? { ...player, connectionStatus: "disconnected", disconnectedAtEpochMs, reconnectExpiresAtEpochMs }
        : player,
    ),
  };
}

export function buildConnectedRoomState(
  roomState: PublicRoomState,
  playerId: string,
): PublicRoomState {
  const isActiveTurnPlayer = roomState.turn?.activePlayerId === playerId;
  return {
    ...roomState,
    players: roomState.players.map((player) =>
      player.id === playerId
        ? { ...player, connectionStatus: "connected", disconnectedAtEpochMs: null, reconnectExpiresAtEpochMs: null }
        : player,
    ),
    ...(isActiveTurnPlayer && roomState.turn
      ? { turn: { ...roomState.turn, turnSkipDeadlineEpochMs: null } }
      : {}),
  };
}

export function buildHostTransferredRoomState(
  roomState: PublicRoomState,
  targetPlayerId: string,
): PublicRoomState {
  return {
    ...roomState,
    hostId: targetPlayerId,
    players: roomState.players.map((p) => ({ ...p, isHost: p.id === targetPlayerId })),
  };
}

export function buildPlayerRemovedRoomState(
  roomState: PublicRoomState,
  playerId: string,
): { nextRoomState: PublicRoomState | null; nextHostId: string } {
  const players = roomState.players.filter((p) => p.id !== playerId);
  const timelines = { ...roomState.timelines };
  delete timelines[playerId];

  const nextHostId =
    roomState.hostId === playerId
      ? (players[0]?.id ?? roomState.hostId)
      : roomState.hostId;

  if (players.length === 0) {
    return { nextRoomState: null, nextHostId };
  }

  return {
    nextRoomState: {
      ...roomState,
      hostId: nextHostId,
      players: players.map((p) => ({ ...p, isHost: p.id === nextHostId })),
      timelines,
    },
    nextHostId,
  };
}

export function selectNextConnectedTurnPlayer(
  roomState: PublicRoomState,
  currentActivePlayerId: string,
): PublicPlayerState | null {
  const currentIndex = roomState.players.findIndex((p) => p.id === currentActivePlayerId);
  if (currentIndex === -1) return null;

  for (let offset = 1; offset < roomState.players.length; offset += 1) {
    const candidate = roomState.players[(currentIndex + offset) % roomState.players.length];
    if (candidate?.connectionStatus === "connected") return candidate;
  }
  return null;
}

export function selectAutomaticHostCandidate(
  roomState: PublicRoomState,
): PublicPlayerState | null {
  return (
    roomState.players.find(
      (p) => p.id !== roomState.hostId && p.connectionStatus === "connected",
    ) ?? null
  );
}
