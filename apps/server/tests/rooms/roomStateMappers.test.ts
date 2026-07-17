import type { GameState, GameTrackCard } from "@tunetrack/game-engine";
import type { PublicRoomState } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import {
  createTrackCardMap,
  mapGameStateToPublicRoomState,
} from "../../src/rooms/roomStateMappers.js";

const HOST_ID = "player-host";
const GUEST_ID = "player-guest";

const trackA: GameTrackCard = {
  id: "track-a",
  title: "Song A",
  artist: "Artist A",
  albumTitle: "Album A",
  releaseYear: 1999,
  sourceReleaseYear: 1998,
  artworkUrl: "https://example.com/a.jpg",
  previewUrl: "https://example.com/a.mp3",
  spotifyTrackUri: "spotify:track:a",
};

const trackB: GameTrackCard = {
  id: "track-b",
  title: "Song B",
  artist: "Artist B",
  albumTitle: "Album B",
  releaseYear: 2005,
};

describe("createTrackCardMap", () => {
  it("indexes cards by id and copies each card", () => {
    const map = createTrackCardMap([trackA, trackB]);

    expect(map.get("track-a")).toEqual(trackA);
    expect(map.get("track-a")).not.toBe(trackA);
    expect(map.size).toBe(2);
  });
});

describe("mapGameStateToPublicRoomState", () => {
  it("preserves lobby room fields while projecting game phase and tokens", () => {
    const roomState = createLobbyRoomState();
    const gameState = createTurnGameState({
      currentTrackCard: trackA,
      timelines: {
        [HOST_ID]: [{ id: trackB.id, releaseYear: trackB.releaseYear }],
        [GUEST_ID]: [],
      },
    });

    const publicState = mapGameStateToPublicRoomState(
      roomState,
      gameState,
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.roomId).toBe(roomState.roomId);
    expect(publicState.hostId).toBe(roomState.hostId);
    expect(publicState.settings).toEqual(roomState.settings);
    expect(publicState.targetTimelineCardCount).toBe(roomState.targetTimelineCardCount);
    expect(publicState.status).toBe("turn");
    expect(publicState.players).toEqual([
      expect.objectContaining({ id: HOST_ID, ttTokenCount: 2, displayName: "Host Player" }),
      expect.objectContaining({ id: GUEST_ID, ttTokenCount: 1, displayName: "Guest Player" }),
    ]);
  });

  it("includes releaseYear on currentTrackCard during turn (baseline; Phase 5 will remove)", () => {
    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({ currentTrackCard: trackA }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.currentTrackCard).toEqual({
      id: "track-a",
      title: "Song A",
      artist: "Artist A",
      albumTitle: "Album A",
      releaseYear: 1999,
      sourceReleaseYear: 1998,
      artworkUrl: "https://example.com/a.jpg",
      previewUrl: "https://example.com/a.mp3",
      spotifyTrackUri: "spotify:track:a",
    });
  });

  it("includes releaseYear on currentTrackCard during challenge (baseline; Phase 5 will remove)", () => {
    const gameState = createTurnGameState({
      phase: "challenge",
      currentTrackCard: trackA,
      challengeState: {
        phase: "open",
        originalPlayerId: HOST_ID,
        originalSelectedSlotIndex: 0,
        placedCard: { id: trackA.id, releaseYear: trackA.releaseYear },
        originalWasCorrect: true,
        originalValidSlotIndexes: [0],
        challengerPlayerId: null,
        challengerSelectedSlotIndex: null,
        challengeDeadlineEpochMs: 1_700_000_000_000,
      },
    });

    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      gameState,
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.status).toBe("challenge");
    expect(publicState.currentTrackCard?.releaseYear).toBe(1999);
    expect(publicState.challengeState).toEqual({
      phase: "open",
      originalPlayerId: HOST_ID,
      originalSelectedSlotIndex: 0,
      challengerPlayerId: null,
      challengeDeadlineEpochMs: 1_700_000_000_000,
      challengerSelectedSlotIndex: null,
    });
    expect(publicState.challengeState).not.toHaveProperty("placedCard");
    expect(publicState.challengeState).not.toHaveProperty("originalWasCorrect");
  });

  it("maps timeline cards with full track metadata and revealedYear", () => {
    const gameState = createTurnGameState({
      timelines: {
        [HOST_ID]: [{ id: trackB.id, releaseYear: 2005 }],
        [GUEST_ID]: [{ id: trackA.id, releaseYear: 1999 }],
      },
    });

    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      gameState,
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.timelines[HOST_ID]).toEqual([
      {
        id: "track-b",
        title: "Song B",
        artist: "Artist B",
        albumTitle: "Album B",
        releaseYear: 2005,
        revealedYear: 2005,
      },
    ]);
    expect(publicState.timelines[GUEST_ID][0]).toEqual(
      expect.objectContaining({
        id: "track-a",
        releaseYear: 1999,
        revealedYear: 1999,
        artworkUrl: "https://example.com/a.jpg",
      }),
    );
  });

  it("maps turn with turnSkipDeadlineEpochMs reset to null", () => {
    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({
        turn: {
          activePlayerId: HOST_ID,
          turnNumber: 3,
          hasUsedSkipTrackWithTt: true,
        },
      }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.turn).toEqual({
      activePlayerId: HOST_ID,
      turnNumber: 3,
      hasUsedSkipTrackWithTt: true,
      turnSkipDeadlineEpochMs: null,
    });
  });

  it("maps revealState and history with public track enrichment", () => {
    const revealEntry = {
      playerId: HOST_ID,
      placedCard: { id: trackA.id, releaseYear: trackA.releaseYear },
      selectedSlotIndex: 1,
      wasCorrect: true,
      revealType: "placement" as const,
      validSlotIndexes: [1],
      challengerPlayerId: GUEST_ID,
      challengerSelectedSlotIndex: 0,
      challengeWasSuccessful: false,
      challengerTtChange: -1,
      awardedPlayerId: HOST_ID,
      awardedSlotIndex: 1,
    };

    const gameState = createTurnGameState({
      phase: "reveal",
      currentTrackCard: null,
      turn: null,
      revealState: revealEntry,
      history: [revealEntry],
    });

    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      gameState,
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.revealState).toEqual({
      playerId: HOST_ID,
      placedCard: expect.objectContaining({
        id: "track-a",
        title: "Song A",
        releaseYear: 1999,
        revealedYear: 1999,
      }),
      selectedSlotIndex: 1,
      wasCorrect: true,
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: GUEST_ID,
      challengerSelectedSlotIndex: 0,
      challengeWasSuccessful: false,
      challengerTtChange: -1,
      awardedPlayerId: HOST_ID,
      awardedSlotIndex: 1,
    });

    expect(publicState.history).toHaveLength(1);
    expect(publicState.history[0]).toEqual({
      playerId: HOST_ID,
      placedCard: expect.objectContaining({
        id: "track-a",
        revealedYear: 1999,
      }),
      selectedSlotIndex: 1,
      wasCorrect: true,
      revealType: "placement",
      challengeWasSuccessful: false,
      challengerPlayerId: GUEST_ID,
      challengerSelectedSlotIndex: 0,
      awardedPlayerId: HOST_ID,
      awardedSlotIndex: 1,
    });
    expect(publicState.history[0]).not.toHaveProperty("validSlotIndexes");
    expect(publicState.history[0]).not.toHaveProperty("challengerTtChange");
  });

  it("projects winner and finished status", () => {
    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({
        phase: "finished",
        currentTrackCard: null,
        turn: null,
        winnerPlayerId: HOST_ID,
      }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.status).toBe("finished");
    expect(publicState.winnerPlayerId).toBe(HOST_ID);
    expect(publicState.currentTrackCard).toBeNull();
    expect(publicState.turn).toBeNull();
  });

  it("throws when a timeline card is missing from the track map", () => {
    const gameState = createTurnGameState({
      timelines: {
        [HOST_ID]: [{ id: "missing-track", releaseYear: 2000 }],
        [GUEST_ID]: [],
      },
    });

    expect(() =>
      mapGameStateToPublicRoomState(
        createLobbyRoomState(),
        gameState,
        createTrackCardMap([trackA, trackB]),
      ),
    ).toThrow("TRACK_CARD_NOT_FOUND");
  });
});

function createLobbyRoomState(): PublicRoomState {
  return {
    roomId: "room-1",
    status: "lobby",
    hostId: HOST_ID,
    players: [
      {
        id: HOST_ID,
        displayName: "Host Player",
        isHost: true,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        ttTokenCount: 0,
        startingTimelineCardCount: 1,
      },
      {
        id: GUEST_ID,
        displayName: "Guest Player",
        isHost: false,
        connectionStatus: "connected",
        disconnectedAtEpochMs: null,
        reconnectExpiresAtEpochMs: null,
        ttTokenCount: 0,
        startingTimelineCardCount: 1,
      },
    ],
    timelines: {},
    currentTrackCard: null,
    targetTimelineCardCount: 10,
    settings: {
      targetTimelineCardCount: 10,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 0,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: 15,
      playlistImported: true,
      importedTrackCount: 20,
      spotifyAuthStatus: "none",
      spotifyAccountType: null,
    },
    turn: null,
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
  };
}

function createTurnGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "turn",
    players: [
      {
        id: HOST_ID,
        displayName: "Host Player",
        startingTimelineCardCount: 1,
        ttTokenCount: 2,
      },
      {
        id: GUEST_ID,
        displayName: "Guest Player",
        startingTimelineCardCount: 1,
        ttTokenCount: 1,
      },
    ],
    timelines: {
      [HOST_ID]: [],
      [GUEST_ID]: [],
    },
    deck: [trackB],
    currentTrackCard: trackA,
    turn: {
      activePlayerId: HOST_ID,
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
    },
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
    targetTimelineCardCount: 10,
    ...overrides,
  };
}
