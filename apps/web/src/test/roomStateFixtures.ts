import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  DEFAULT_STARTING_TT_TOKEN_COUNT,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
  type TimelineCardPublic,
  type TrackCardPublic,
} from "@tunetrack/shared";

/**
 * Placeholder data only. No real account identifiers, playlist URLs or personal names.
 */

export const TEST_ROOM_ID = "TEST_ROOM_1";
export const TEST_HOST_ID = "player-host";
export const TEST_GUEST_ID = "player-guest";

export function buildPlayer(overrides: Partial<PublicPlayerState> = {}): PublicPlayerState {
  return {
    id: TEST_HOST_ID,
    displayName: "Player One",
    isHost: true,
    connectionStatus: "connected",
    disconnectedAtEpochMs: null,
    reconnectExpiresAtEpochMs: null,
    ttTokenCount: 0,
    startingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
    ...overrides,
  };
}

export function buildTrackCard(overrides: Partial<TrackCardPublic> = {}): TrackCardPublic {
  return {
    id: "track-1",
    title: "Test Track One",
    artist: "Test Artist",
    albumTitle: "Test Album",
    metadataStatus: "imported",
    spotifyTrackUri: "spotify:track:TEST0000000000000001",
    ...overrides,
  };
}

export function buildTimelineCard(
  overrides: Partial<TimelineCardPublic> = {},
): TimelineCardPublic {
  return {
    ...buildTrackCard(),
    id: "timeline-1",
    title: "Placed Track",
    releaseYear: 1984,
    revealedYear: 1984,
    ...overrides,
  };
}

export function buildRoomSettings(
  overrides: Partial<PublicRoomSettings> = {},
): PublicRoomSettings {
  return {
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
    spotifyPlaybackOwnerPlayerId: null,
    spotifyPlaybackGeneration: 0,
    ...overrides,
  };
}

export function buildLobbyRoomState(
  overrides: Partial<PublicRoomState> = {},
): PublicRoomState {
  return {
    roomId: TEST_ROOM_ID,
    status: "lobby",
    hostId: TEST_HOST_ID,
    players: [
      buildPlayer(),
      buildPlayer({ id: TEST_GUEST_ID, displayName: "Player Two", isHost: false }),
    ],
    timelines: {},
    currentTrackCard: null,
    targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
    settings: buildRoomSettings(),
    turn: null,
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
    ...overrides,
  };
}

export function buildTurnRoomState(
  overrides: Partial<PublicRoomState> = {},
): PublicRoomState {
  const lobby = buildLobbyRoomState();

  return {
    ...lobby,
    status: "turn",
    timelines: {
      [TEST_HOST_ID]: [buildTimelineCard({ id: "timeline-host-1" })],
      [TEST_GUEST_ID]: [
        buildTimelineCard({ id: "timeline-guest-1", releaseYear: 1997, revealedYear: 1997 }),
      ],
    },
    // The release year is deliberately absent during a turn: it is the answer.
    currentTrackCard: buildTrackCard({ id: "track-current", title: "Current Track" }),
    turn: {
      activePlayerId: TEST_HOST_ID,
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: null,
    },
    ...overrides,
  };
}

export function buildChallengeRoomState(
  overrides: Partial<PublicRoomState> = {},
): PublicRoomState {
  const turn = buildTurnRoomState();

  return {
    ...turn,
    status: "challenge",
    challengeState: {
      phase: "open",
      originalPlayerId: TEST_HOST_ID,
      originalSelectedSlotIndex: 1,
      challengerPlayerId: null,
      challengeDeadlineEpochMs: null,
      challengerSelectedSlotIndex: null,
    },
    ...overrides,
  };
}

export function buildRevealRoomState(
  overrides: Partial<PublicRoomState> = {},
): PublicRoomState {
  const turn = buildTurnRoomState();
  const placedCard = buildTimelineCard({
    id: "track-current",
    title: "Current Track",
    releaseYear: 1991,
    revealedYear: 1991,
  });

  return {
    ...turn,
    status: "reveal",
    currentTrackCard: placedCard,
    revealState: {
      playerId: TEST_HOST_ID,
      placedCard,
      selectedSlotIndex: 1,
      wasCorrect: true,
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: TEST_HOST_ID,
      awardedSlotIndex: 1,
    },
    ...overrides,
  };
}

export function buildFinishedRoomState(
  overrides: Partial<PublicRoomState> = {},
): PublicRoomState {
  return {
    ...buildTurnRoomState(),
    status: "finished",
    winnerPlayerId: TEST_HOST_ID,
    turn: null,
    currentTrackCard: null,
    ...overrides,
  };
}
