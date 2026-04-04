import { describe, expect, it } from "vitest";
import { GameFlowService, type GamePlayer, type GameTrackCard } from "../src/index.js";

const players: GamePlayer[] = [
  {
    id: "player-1",
    displayName: "Player 1",
    startingTimelineCardCount: 1,
  },
  {
    id: "player-2",
    displayName: "Player 2",
    startingTimelineCardCount: 2,
  },
];

const deck: GameTrackCard[] = [
  {
    id: "track-1",
    title: "Song 1",
    artist: "Artist 1",
    albumTitle: "Album 1",
    releaseYear: 1990,
  },
  {
    id: "track-2",
    title: "Song 2",
    artist: "Artist 2",
    albumTitle: "Album 2",
    releaseYear: 2005,
  },
  {
    id: "track-3",
    title: "Song 3",
    artist: "Artist 3",
    albumTitle: "Album 3",
    releaseYear: 1985,
  },
  {
    id: "track-4",
    title: "Song 4",
    artist: "Artist 4",
    albumTitle: "Album 4",
    releaseYear: 2000,
  },
  {
    id: "track-5",
    title: "Song 5",
    artist: "Artist 5",
    albumTitle: "Album 5",
    releaseYear: 1975,
  },
  {
    id: "track-6",
    title: "Song 6",
    artist: "Artist 6",
    albumTitle: "Album 6",
    releaseYear: 2010,
  },
];

describe("GameFlowService", () => {
  const gameFlowService = new GameFlowService();

  it("starts a game with per-player starting timelines and a current turn card", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(gameState.phase).toBe("turn");
    expect(gameState.turn).toEqual({
      activePlayerId: "player-1",
      turnNumber: 1,
    });
    expect(gameState.timelines["player-1"]).toEqual([
      {
        id: "track-1",
        releaseYear: 1990,
      },
    ]);
    expect(gameState.timelines["player-2"]).toEqual([
      {
        id: "track-3",
        releaseYear: 1985,
      },
      {
        id: "track-2",
        releaseYear: 2005,
      },
    ]);
    expect(gameState.currentTrackCard?.id).toBe("track-4");
    expect(gameState.deck.map((card) => card.id)).toEqual(["track-5", "track-6"]);
  });

  it("rejects placement from a non-active player", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(() => gameFlowService.placeCard(gameState, "player-2", 1)).toThrow(
      "NOT_ACTIVE_PLAYER",
    );
  });

  it("inserts a correctly placed card, enters reveal phase, and finishes when the player reaches the target count", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 2,
    });

    const revealGameState = gameFlowService.placeCard(gameState, "player-1", 1);

    expect(revealGameState.phase).toBe("reveal");
    expect(revealGameState.revealState).toEqual({
      playerId: "player-1",
      placedCard: {
        id: "track-4",
        releaseYear: 2000,
      },
      selectedSlotIndex: 1,
      wasCorrect: true,
      validSlotIndexes: [1],
    });
    expect(revealGameState.timelines["player-1"]).toEqual([
      {
        id: "track-1",
        releaseYear: 1990,
      },
      {
        id: "track-4",
        releaseYear: 2000,
      },
    ]);
    expect(revealGameState.winnerPlayerId).toBe("player-1");

    const finishedGameState = gameFlowService.confirmReveal(revealGameState);

    expect(finishedGameState.phase).toBe("finished");
    expect(finishedGameState.turn).toBeNull();
    expect(finishedGameState.currentTrackCard).toBeNull();
    expect(finishedGameState.revealState).toBeNull();
    expect(finishedGameState.winnerPlayerId).toBe("player-1");
  });

  it("discards a wrongly placed card and advances to the next player after reveal confirmation", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    const revealGameState = gameFlowService.placeCard(gameState, "player-1", 0);

    expect(revealGameState.phase).toBe("reveal");
    expect(revealGameState.revealState?.wasCorrect).toBe(false);
    expect(revealGameState.revealState?.validSlotIndexes).toEqual([1]);
    expect(revealGameState.timelines["player-1"]).toEqual([
      {
        id: "track-1",
        releaseYear: 1990,
      },
    ]);
    expect(revealGameState.winnerPlayerId).toBeNull();

    const nextTurnState = gameFlowService.confirmReveal(revealGameState);

    expect(nextTurnState.phase).toBe("turn");
    expect(nextTurnState.turn).toEqual({
      activePlayerId: "player-2",
      turnNumber: 2,
    });
    expect(nextTurnState.currentTrackCard?.id).toBe("track-5");
    expect(nextTurnState.revealState).toBeNull();
  });

  it("throws when confirming reveal outside reveal phase", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(() => gameFlowService.confirmReveal(gameState)).toThrow(
      "GAME_NOT_IN_REVEAL_PHASE",
    );
  });
});
