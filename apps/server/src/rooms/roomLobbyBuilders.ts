import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  DEFAULT_TT_MODE_ENABLED,
  MAX_STARTING_TT_TOKEN_COUNT,
  PLAYER_NAME_MAX_LENGTH,
  countTracksToCheck,
  type DeckSource,
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
    ttTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
    startingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  };

  const settings: PublicRoomSettings = {
    targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
    defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
    startingTtTokenCount: DEFAULT_STARTING_TT_TOKEN_COUNT,
    revealConfirmMode: "host_only",
    ttModeEnabled: DEFAULT_TT_MODE_ENABLED,
    challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
    playlistImported: false,
    importedTrackCount: 0,
    tracksToCheckCount: 0,
    deckSource: "none",
    spotifyAuthStatus: "none",
    spotifyAccountType: null,
    spotifyPlaybackOwnerPlayerId: null,
    spotifyPlaybackGeneration: 0,
  };

  return {
    roomId,
    status: "lobby",
    hostId: playerId,
    players: [player],
    timelines: { [playerId]: [] },
    currentTrackCard: null,
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
    displayName: buildUniqueDisplayName(roomState.players, displayName),
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

/**
 * A name another player in the room already uses (trimmed, any case) gets the lowest free
 * numeric suffix, "Player One 2", for this room only (decision 11): joining stays one tap, and
 * the leaderboard never shows two identical names.
 */
export function buildUniqueDisplayName(
  players: readonly PublicPlayerState[],
  displayName: string,
  ownPlayerId?: string,
): string {
  const takenNames = new Set(
    players
      .filter((player) => player.id !== ownPlayerId)
      .map((player) => normaliseDisplayName(player.displayName)),
  );
  const name = displayName.trim();
  if (!takenNames.has(normaliseDisplayName(name))) return name;

  for (let suffix = 2; ; suffix += 1) {
    const suffixText = ` ${suffix}`;
    const candidate = `${name.slice(0, PLAYER_NAME_MAX_LENGTH - suffixText.length).trimEnd()}${suffixText}`;
    if (!takenNames.has(normaliseDisplayName(candidate))) return candidate;
  }
}

function normaliseDisplayName(displayName: string): string {
  return displayName.trim().toLocaleLowerCase();
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
      player.id === playerId
        ? {
            ...player,
            displayName: buildUniqueDisplayName(roomState.players, displayName, playerId),
          }
        : player,
    ),
  };
}

export function buildRenamedRoomState(
  roomState: PublicRoomState,
  nextRoomId: RoomId,
): PublicRoomState {
  return {
    ...roomState,
    roomId: nextRoomId,
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
  deckSource: Exclude<DeckSource, "none">,
): PublicRoomState {
  return {
    ...roomState,
    settings: {
      ...roomState.settings,
      playlistImported: true,
      importedTrackCount: deck.length,
      tracksToCheckCount: countTracksToCheck(deck),
      deckSource: deck.length > 0 ? deckSource : "none",
    },
  };
}

export function buildSpotifyAuthRoomState(
  roomState: PublicRoomState,
  status: "none" | "connected",
  accountType: SpotifyAccountType | null,
  playbackOwnerPlayerId: string | null,
): PublicRoomState {
  return {
    ...roomState,
    settings: {
      ...roomState.settings,
      spotifyAuthStatus: status,
      spotifyAccountType: accountType,
      spotifyPlaybackOwnerPlayerId: status === "connected" ? playbackOwnerPlayerId : null,
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
      tracksToCheckCount: countTracksToCheck(nextDeck),
      playlistImported: nextDeck.length > 0,
      deckSource: nextDeck.length > 0 ? roomState.settings.deckSource : "none",
    },
  };
}
