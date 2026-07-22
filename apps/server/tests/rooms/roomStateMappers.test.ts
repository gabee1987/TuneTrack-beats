import type { GameState, GameTrackCard, RevealState } from "@tunetrack/game-engine";
import type { PublicRoomState } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import {
  createTrackCardMap,
  mapGameStateToPublicRoomState,
  PUBLIC_HISTORY_MAX_ENTRIES,
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

  it("omits releaseYear and sourceReleaseYear on currentTrackCard during turn", () => {
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
      artworkUrl: "https://example.com/a.jpg",
      previewUrl: "https://example.com/a.mp3",
      spotifyTrackUri: "spotify:track:a",
    });
    expect(publicState.currentTrackCard).not.toHaveProperty("releaseYear");
    expect(publicState.currentTrackCard).not.toHaveProperty("sourceReleaseYear");
  });

  it("omits releaseYear and sourceReleaseYear on currentTrackCard during challenge", () => {
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
    expect(publicState.currentTrackCard).not.toHaveProperty("releaseYear");
    expect(publicState.currentTrackCard).not.toHaveProperty("sourceReleaseYear");
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

  it("includes releaseYear on currentTrackCard during reveal", () => {
    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({
        phase: "reveal",
        currentTrackCard: trackA,
        turn: null,
      }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.status).toBe("reveal");
    expect(publicState.currentTrackCard?.releaseYear).toBe(1999);
    expect(publicState.currentTrackCard?.sourceReleaseYear).toBe(1998);
  });

  it("includes releaseYear on currentTrackCard during finished", () => {
    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({
        phase: "finished",
        currentTrackCard: trackA,
        turn: null,
        winnerPlayerId: HOST_ID,
      }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.status).toBe("finished");
    expect(publicState.currentTrackCard?.releaseYear).toBe(1999);
    expect(publicState.currentTrackCard?.sourceReleaseYear).toBe(1998);
    expect(publicState.winnerPlayerId).toBe(HOST_ID);
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

  it("keeps timeline years even while currentTrackCard year is hidden", () => {
    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({
        currentTrackCard: trackA,
        timelines: {
          [HOST_ID]: [{ id: trackB.id, releaseYear: 2005 }],
          [GUEST_ID]: [],
        },
      }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.currentTrackCard).not.toHaveProperty("releaseYear");
    expect(publicState.timelines[HOST_ID][0].releaseYear).toBe(2005);
    expect(publicState.timelines[HOST_ID][0].revealedYear).toBe(2005);
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

  it(`caps public history to the last ${PUBLIC_HISTORY_MAX_ENTRIES} entries`, () => {
    const historyLength = PUBLIC_HISTORY_MAX_ENTRIES + 12;
    const history = Array.from({ length: historyLength }, (_, index) =>
      createHistoryEntry(index),
    );

    const publicState = mapGameStateToPublicRoomState(
      createLobbyRoomState(),
      createTurnGameState({ history }),
      createTrackCardMap([trackA, trackB]),
    );

    expect(publicState.history).toHaveLength(PUBLIC_HISTORY_MAX_ENTRIES);
    expect(publicState.history[0]?.selectedSlotIndex).toBe(12);
    expect(publicState.history.at(-1)?.selectedSlotIndex).toBe(historyLength - 1);
    expect(publicState.history.every((entry) => entry.placedCard.releaseYear === 1999)).toBe(true);
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

function createHistoryEntry(selectedSlotIndex: number): RevealState {
  return {
    playerId: HOST_ID,
    placedCard: { id: trackA.id, releaseYear: trackA.releaseYear },
    selectedSlotIndex,
    wasCorrect: true,
    revealType: "placement",
    validSlotIndexes: [selectedSlotIndex],
    challengerPlayerId: null,
    challengerSelectedSlotIndex: null,
    challengeWasSuccessful: null,
    challengerTtChange: 0,
    awardedPlayerId: HOST_ID,
    awardedSlotIndex: selectedSlotIndex,
  };
}

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
