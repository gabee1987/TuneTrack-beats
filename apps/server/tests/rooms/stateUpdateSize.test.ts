import type { GameState, GameTrackCard, RevealState } from "@tunetrack/game-engine";
import type { PublicRoomState } from "@tunetrack/shared";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { STATE_UPDATE_COMPRESSION_THRESHOLD_BYTES } from "../../src/app/createSocketServer.js";
import {
  createTrackCardMap,
  mapGameStateToPublicRoomState,
  PUBLIC_HISTORY_MAX_ENTRIES,
} from "../../src/rooms/roomStateMappers.js";

/** `05` A10 gate, applied to the compressed size on the wire (decision 20). */
const STATE_UPDATE_BUDGET_BYTES = 64 * 1024;
const PLAYER_COUNT = 6;
const CARDS_PER_TIMELINE = 30;
const PLAYER_NAMES = ["One", "Two", "Three", "Four", "Five", "Six"].map((n) => `Player ${n}`);

/** Deterministic pseudo-random hex, so the compressed size is not flattered by repetition. */
function hex(seed: number, length: number): string {
  let state = (seed + 1) * 2654435761;
  let result = "";
  while (result.length < length) {
    state = (state * 1103515245 + 12345) % 2147483648;
    result += state.toString(16);
  }
  return result.slice(0, length);
}

/** Placeholder hosts, but URL and URI lengths match what Spotify returns. */
function buildCard(index: number): GameTrackCard {
  return {
    id: `track-${hex(index, 22)}`,
    title: `Test Track Number ${index} (Remastered Edition)`,
    artist: `Test Artist ${index}`,
    albumTitle: `Test Album ${index} (Deluxe Version)`,
    releaseYear: 1960 + (index % 60),
    sourceReleaseYear: 1960 + (index % 60),
    genre: "test genre",
    artworkUrl: `https://images.test/image/ab67616d0000b273${hex(index, 24)}`,
    previewUrl: `https://audio.test/mp3-preview/${hex(index, 40)}?cid=${hex(index, 32)}`,
    spotifyTrackUri: `spotify:track:${hex(index, 22)}`,
  };
}

function buildLargestRoomState(): PublicRoomState {
  const playerIds = PLAYER_NAMES.map((_, index) => `player-${index + 1}`);
  const cards = Array.from({ length: PLAYER_COUNT * CARDS_PER_TIMELINE + 1 }, (_, i) =>
    buildCard(i),
  );
  const timelines = Object.fromEntries(
    playerIds.map((playerId, playerIndex) => [
      playerId,
      cards
        .slice(playerIndex * CARDS_PER_TIMELINE, (playerIndex + 1) * CARDS_PER_TIMELINE)
        .map((card) => ({ id: card.id, releaseYear: card.releaseYear })),
    ]),
  );
  const history: RevealState[] = Array.from({ length: PUBLIC_HISTORY_MAX_ENTRIES }, (_, i) => {
    const card = cards[i] as GameTrackCard;
    return {
      playerId: playerIds[i % PLAYER_COUNT] as string,
      placedCard: { id: card.id, releaseYear: card.releaseYear },
      selectedSlotIndex: i % CARDS_PER_TIMELINE,
      wasCorrect: i % 2 === 0,
      revealType: "placement",
      validSlotIndexes: [i % CARDS_PER_TIMELINE],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: playerIds[i % PLAYER_COUNT] as string,
      awardedSlotIndex: i % CARDS_PER_TIMELINE,
    };
  });
  const gameState: GameState = {
    phase: "turn",
    players: playerIds.map((id, index) => ({
      id,
      displayName: PLAYER_NAMES[index] as string,
      startingTimelineCardCount: 1,
      ttTokenCount: 3,
    })),
    timelines,
    deck: [],
    discardPile: [],
    currentTrackCard: cards[cards.length - 1] as GameTrackCard,
    turn: {
      activePlayerId: playerIds[0] as string,
      turnNumber: 120,
      hasUsedSkipTrackWithTt: false,
    },
    challengeState: null,
    revealState: null,
    history,
    winnerPlayerId: null,
    targetTimelineCardCount: CARDS_PER_TIMELINE,
  };
  const lobbyState: PublicRoomState = {
    roomId: "TEST_ROOM_1",
    status: "lobby",
    hostId: playerIds[0] as string,
    players: playerIds.map((id, index) => ({
      id,
      displayName: PLAYER_NAMES[index] as string,
      isHost: index === 0,
      connectionStatus: "connected",
      disconnectedAtEpochMs: null,
      reconnectExpiresAtEpochMs: null,
      ttTokenCount: 3,
      startingTimelineCardCount: 1,
    })),
    timelines: {},
    currentTrackCard: null,
    targetTimelineCardCount: CARDS_PER_TIMELINE,
    settings: {
      targetTimelineCardCount: CARDS_PER_TIMELINE,
      defaultStartingTimelineCardCount: 1,
      startingTtTokenCount: 3,
      revealConfirmMode: "host_only",
      ttModeEnabled: true,
      challengeWindowDurationSeconds: 15,
      playlistImported: true,
      importedTrackCount: cards.length,
      spotifyAuthStatus: "connected",
      spotifyAccountType: "premium",
      spotifyPlaybackOwnerPlayerId: playerIds[0] as string,
      spotifyPlaybackGeneration: 1,
    },
    turn: null,
    challengeState: null,
    revealState: null,
    history: [],
    winnerPlayerId: null,
  };

  return mapGameStateToPublicRoomState(lobbyState, gameState, createTrackCardMap(cards));
}

describe("state_update size (B-16)", () => {
  it(`stays within ${STATE_UPDATE_BUDGET_BYTES / 1024} kB compressed for 6 players × 30 cards and full history`, () => {
    const roomState = buildLargestRoomState();
    const payload = JSON.stringify({ roomState });
    const payloadBytes = Buffer.byteLength(payload, "utf8");
    const historyBytes = Buffer.byteLength(JSON.stringify(roomState.history), "utf8");
    const compressedBytes = deflateRawSync(payload).length;

    // Recorded in docs/plans/2026-10-project-review/network-baseline.md.
    console.info(
      `state_update: ${payloadBytes} bytes raw (history ${historyBytes}), ${compressedBytes} deflated`,
    );

    expect(Object.values(roomState.timelines).flat()).toHaveLength(
      PLAYER_COUNT * CARDS_PER_TIMELINE,
    );
    expect(roomState.history).toHaveLength(PUBLIC_HISTORY_MAX_ENTRIES);
    expect(payloadBytes).toBeGreaterThan(STATE_UPDATE_COMPRESSION_THRESHOLD_BYTES);
    expect(compressedBytes).toBeLessThanOrEqual(STATE_UPDATE_BUDGET_BYTES);
  });
});
