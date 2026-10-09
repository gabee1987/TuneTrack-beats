import { describe, expect, it } from "vitest";
import { GameFlowService } from "../src/index.js";
import { deck, players, sameYearGameInput } from "./fixtures/twoPlayerGame.js";

describe("turn flow", () => {
  const gameFlowService = new GameFlowService();

  it("starts a game with per-player starting timelines and a current turn card", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(gameState.phase).toBe("turn");
    expect(gameState.players).toEqual([
      expect.objectContaining({
        id: "player-1",
        ttTokenCount: 0,
      }),
      expect.objectContaining({
        id: "player-2",
        ttTokenCount: 0,
      }),
    ]);
    expect(gameState.turn).toEqual({
      activePlayerId: "player-1",
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
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

  it("starts players with their configured TT balance", () => {
    const gameState = gameFlowService.startGame({
      players: [
        {
          id: "player-1",
          displayName: "Player 1",
          startingTimelineCardCount: 1,
          startingTtTokenCount: 2,
        },
        {
          id: "player-2",
          displayName: "Player 2",
          startingTimelineCardCount: 2,
          startingTtTokenCount: 4,
        },
      ],
      deck,
      targetTimelineCardCount: 3,
    });

    expect(gameState.players).toEqual([
      expect.objectContaining({
        id: "player-1",
        ttTokenCount: 2,
      }),
      expect.objectContaining({
        id: "player-2",
        ttTokenCount: 4,
      }),
    ]);
  });

  it("rejects placement from a non-active player", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(() => gameFlowService.placeCard(gameState, "player-2", 1)).toThrow("NOT_ACTIVE_PLAYER");
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
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: "player-1",
      awardedSlotIndex: 1,
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
      hasUsedSkipTrackWithTt: false,
    });
    expect(nextTurnState.currentTrackCard?.id).toBe("track-5");
    expect(nextTurnState.revealState).toBeNull();
  });

  it("can pass an interrupted turn to a specific next player without drawing a new card", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    const nextTurnState = gameFlowService.advanceTurnToPlayer(gameState, "player-2");

    expect(nextTurnState.phase).toBe("turn");
    expect(nextTurnState.turn).toEqual({
      activePlayerId: "player-2",
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
    });
    expect(nextTurnState.currentTrackCard).toBe(gameState.currentTrackCard);
    expect(nextTurnState.deck).toEqual(gameState.deck);
  });

  it("skips a manual turn to a specific player and draws a fresh card", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    const previousCardId = gameState.currentTrackCard?.id;
    const deckLengthBeforeSkip = gameState.deck.length;

    const skippedState = gameFlowService.skipTurnToPlayer(gameState, "player-2");

    expect(skippedState.phase).toBe("turn");
    expect(skippedState.turn).toEqual({
      activePlayerId: "player-2",
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
    });
    expect(skippedState.currentTrackCard?.id).not.toBe(previousCardId);
    expect(skippedState.deck.length).toBe(deckLengthBeforeSkip - 1);
  });

  it("throws when skipping a manual turn to an unknown player", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(() => gameFlowService.skipTurnToPlayer(gameState, "player-unknown")).toThrow(
      "PLAYER_NOT_FOUND",
    );
  });

  it("throws when confirming reveal outside reveal phase", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    expect(() => gameFlowService.confirmReveal(gameState)).toThrow("GAME_NOT_IN_REVEAL_PHASE");
  });

  it("removes a player from engine turn order and timelines", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });

    const updatedGameState = gameFlowService.removePlayer(gameState, "player-2");

    expect(updatedGameState.players.map((player) => player.id)).toEqual(["player-1"]);
    expect(updatedGameState.timelines["player-2"]).toBeUndefined();
    expect(updatedGameState.turn?.activePlayerId).toBe("player-1");
  });

  it("refuses to start without players", () => {
    expect(() =>
      gameFlowService.startGame({ players: [], deck, targetTimelineCardCount: 3 }),
    ).toThrow("NOT_ENOUGH_PLAYERS");
  });

  it("refuses to start when the deck cannot deal every starting card and a turn card", () => {
    expect(() =>
      gameFlowService.startGame({ players, deck: deck.slice(0, 3), targetTimelineCardCount: 3 }),
    ).toThrow("NOT_ENOUGH_CARDS");
  });

  it("refuses a target that is not a positive whole number", () => {
    for (const targetTimelineCardCount of [0, 2.5]) {
      expect(() => gameFlowService.startGame({ players, deck, targetTimelineCardCount })).toThrow(
        "INVALID_TARGET_TIMELINE_CARD_COUNT",
      );
    }
  });

  it("rejects a slot outside the active player's timeline", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 3 });

    for (const slotIndex of [-1, 2, 0.5]) {
      expect(() => gameFlowService.placeCard(gameState, "player-1", slotIndex)).toThrow(
        "INVALID_SLOT_INDEX",
      );
    }
  });

  it("refuses a placement outside the turn phase", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 3 });
    const revealGameState = gameFlowService.placeCard(gameState, "player-1", 1);

    expect(() => gameFlowService.placeCard(revealGameState, "player-1", 1)).toThrow(
      "GAME_NOT_IN_TURN_PHASE",
    );
  });

  it("accepts every slot of a same-year block and keeps the card where the player put it", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput());

    for (const slotIndex of [1, 2, 3]) {
      const revealGameState = gameFlowService.placeCard(gameState, "player-1", slotIndex);

      expect(revealGameState.revealState).toEqual(
        expect.objectContaining({
          wasCorrect: true,
          validSlotIndexes: [1, 2, 3],
          awardedSlotIndex: slotIndex,
        }),
      );
      expect(revealGameState.timelines["player-1"]?.[slotIndex]?.id).toBe("same-5");
    }
    expect(gameFlowService.placeCard(gameState, "player-1", 0).revealState?.wasCorrect).toBe(false);
  });

  it("returns the turn to the first player after the last one", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 4 });
    const secondTurnState = gameFlowService.confirmReveal(
      gameFlowService.placeCard(gameState, "player-1", 0),
    );
    const thirdTurnState = gameFlowService.confirmReveal(
      gameFlowService.placeCard(secondTurnState, "player-2", 0),
    );

    expect(thirdTurnState.turn).toEqual({
      activePlayerId: "player-1",
      turnNumber: 3,
      hasUsedSkipTrackWithTt: false,
    });
  });

  it("refuses to pass the turn to the player who already has it", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 3 });

    expect(() => gameFlowService.advanceTurnToPlayer(gameState, "player-1")).toThrow(
      "ACTIVE_PLAYER_UNCHANGED",
    );
    expect(() => gameFlowService.advanceTurnToPlayer(gameState, "player-unknown")).toThrow(
      "PLAYER_NOT_FOUND",
    );
  });

  it("skips an offline player's turn to the next seat and discards their card", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 3 });

    const skippedState = gameFlowService.skipOfflinePlayerTurn(gameState);

    expect(skippedState.turn?.activePlayerId).toBe("player-2");
    expect(skippedState.currentTrackCard?.id).toBe("track-5");
    expect(skippedState.discardPile.map((card) => card.id)).toEqual(["track-4"]);
    expect(skippedState.timelines).toEqual(gameState.timelines);
  });
});
