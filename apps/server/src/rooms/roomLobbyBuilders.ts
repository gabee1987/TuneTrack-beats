import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
  type RoomId,
  type SpotifyAccountType,
  type UpdatePlayerSettingsPayloadParsed,
  type UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import type { GameTrackCard } from "@tunetrack/game-engine";

export function buildInitialRoomState(
  roomId: RoomId,
  playerId: string,
  displayName: string,
): PublicRoomState {
  const player: PublicPlayerState = {
    id: playerId,
    displayName,
    isHost: true,
    connectionStatus: "connected",
    disconnectedAtEpochMs: null,
    reconnectExpiresAtEpochMs: null,
    ttTokenCount: 0,
    startingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  };

  const settings: PublicRoomSettings = {
    targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
    defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
    startingTtTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
    revealConfirmMode: "host_only",
    ttModeEnabled: false,
    challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
    playlistImported: false,
    importedTrackCount: 0,
    spotifyAuthStatus: "none",
    spotifyAccountType: null,
  };

  return {
    roomId,
    status: "lobby",
    hostId: playerId,
    players: [player],
    timelines: { [playerId]: [] },
    currentTrackCard: null,
    targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
    settings,
    turn: null,
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
  };
}

export function buildPlayerJoinedRoomState(
  roomState: PublicRoomState,
  playerId: string,
  displayName: string,
): PublicRoomState {
  const player: PublicPlayerState = {
    id: playerId,
    displayName,
    isHost: false,
    connectionStatus: "connected",
    disconnectedAtEpochMs: null,
    reconnectExpiresAtEpochMs: null,
    ttTokenCount: roomState.settings.startingTtTokenCount,
    startingTimelineCardCount: roomState.settings.defaultStartingTimelineCardCount,
  };

  return {
    ...roomState,
    players: [...roomState.players, player],
    timelines: { ...roomState.timelines, [playerId]: [] },
  };
}

export function buildUpdatedSettingsRoomState(
  roomState: PublicRoomState,
  payload: UpdateRoomSettingsPayloadParsed,
): PublicRoomState {
  const didDefaultStartingCardCountChange =
    roomState.settings.defaultStartingTimelineCardCount !==
    payload.defaultStartingTimelineCardCount;
  const didStartingTtTokenCountChange =
    roomState.settings.startingTtTokenCount !== payload.startingTtTokenCount;
  const didEnableTtMode = !roomState.settings.ttModeEnabled && payload.ttModeEnabled;
  const shouldResetStartingTtTokenCount = didStartingTtTokenCountChange || didEnableTtMode;

  return {
    ...roomState,
    targetTimelineCardCount: payload.targetTimelineCardCount,
    players:
      didDefaultStartingCardCountChange || shouldResetStartingTtTokenCount
        ? roomState.players.map((player) => ({
            ...player,
            ...(didDefaultStartingCardCountChange
              ? { startingTimelineCardCount: payload.defaultStartingTimelineCardCount }
              : {}),
            ...(shouldResetStartingTtTokenCount
              ? { ttTokenCount: payload.startingTtTokenCount }
              : {}),
          }))
        : roomState.players,
    settings: {
      ...roomState.settings,
      targetTimelineCardCount: payload.targetTimelineCardCount,
      defaultStartingTimelineCardCount: payload.defaultStartingTimelineCardCount,
      startingTtTokenCount: payload.startingTtTokenCount,
      revealConfirmMode: payload.revealConfirmMode,
      ttModeEnabled: payload.ttModeEnabled,
      challengeWindowDurationSeconds: payload.challengeWindowDurationSeconds,
    },
  };
}

export function buildUpdatedPlayerSettingsRoomState(
  roomState: PublicRoomState,
  payload: UpdatePlayerSettingsPayloadParsed,
): PublicRoomState {
  return {
    ...roomState,
    players: roomState.players.map((player) =>
      player.id === payload.playerId
        ? {
            ...player,
            startingTimelineCardCount: payload.startingTimelineCardCount,
            ttTokenCount: payload.startingTtTokenCount,
          }
        : player,
    ),
  };
}

export function buildUpdatedProfileRoomState(
  roomState: PublicRoomState,
  playerId: string,
  displayName: string,
): PublicRoomState {
  return {
    ...roomState,
    players: roomState.players.map((player) =>
      player.id === playerId ? { ...player, displayName } : player,
    ),
  };
}

export function buildAwardedTtLobbyRoomState(
  roomState: PublicRoomState,
  playerId: string,
  amount: number,
): PublicRoomState {
  return {
    ...roomState,
    players: roomState.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            ttTokenCount: Math.max(
              0,
              Math.min(MAX_STARTING_TT_TOKEN_COUNT, player.ttTokenCount + amount),
            ),
          }
        : player,
    ),
  };
}

export function buildImportedDeckRoomState(
  roomState: PublicRoomState,
  deck: GameTrackCard[],
): PublicRoomState {
  return {
    ...roomState,
    settings: {
      ...roomState.settings,
      playlistImported: true,
      importedTrackCount: deck.length,
    },
  };
}

export function buildSpotifyAuthRoomState(
  roomState: PublicRoomState,
  status: "none" | "connected",
  accountType: SpotifyAccountType | null,
): PublicRoomState {
  return {
    ...roomState,
    settings: {
      ...roomState.settings,
      spotifyAuthStatus: status,
      spotifyAccountType: accountType,
    },
  };
}

export function buildRemovedTracksRoomState(
  roomState: PublicRoomState,
  nextDeck: GameTrackCard[],
): PublicRoomState {
  return {
    ...roomState,
    settings: {
      ...roomState.settings,
      importedTrackCount: nextDeck.length,
      playlistImported: nextDeck.length > 0,
    },
  };
}
