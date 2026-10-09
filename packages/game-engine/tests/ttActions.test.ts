import { describe, expect, it } from "vitest";
import { GameFlowService } from "../src/index.js";
import { deck, players, sameYearGameInput, ttTokenCountOf } from "./fixtures/twoPlayerGame.js";

describe("TT actions", () => {
  const gameFlowService = new GameFlowService();

  it("lets the host award TT manually during a game", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });

    const updatedGameState = gameFlowService.awardTtTokens(gameState, "player-2", 1);

    expect(updatedGameState.players.find((player) => player.id === "player-2")?.ttTokenCount).toBe(
      1,
    );
  });

  it("never lets a player go above 5 TT", () => {
    const gameState = gameFlowService.startGame({
      players: [
        {
          id: "player-1",
          displayName: "Player 1",
          startingTimelineCardCount: 1,
          startingTtTokenCount: 5,
        },
        {
          id: "player-2",
          displayName: "Player 2",
          startingTimelineCardCount: 2,
          startingTtTokenCount: 0,
        },
      ],
      deck,
      targetTimelineCardCount: 4,
    });

    const updatedGameState = gameFlowService.awardTtTokens(gameState, "player-1", 1);

    expect(updatedGameState.players.find((player) => player.id === "player-1")?.ttTokenCount).toBe(
      5,
    );
  });

  it("lets the active player spend 1 TT to skip the current card and draw a new one", () => {
    const gameState = gameFlowService.startGame({
      players: [
        {
          id: "player-1",
          displayName: "Player 1",
          startingTimelineCardCount: 1,
          startingTtTokenCount: 1,
        },
        {
          id: "player-2",
          displayName: "Player 2",
          startingTimelineCardCount: 2,
          startingTtTokenCount: 0,
        },
      ],
      deck,
      targetTimelineCardCount: 4,
    });

    const skippedGameState = gameFlowService.skipCurrentTrackWithTt(gameState, "player-1");

    expect(skippedGameState.currentTrackCard?.id).toBe("track-5");
    expect(skippedGameState.players.find((player) => player.id === "player-1")?.ttTokenCount).toBe(
      0,
    );
    expect(skippedGameState.turn).toEqual({
      activePlayerId: "player-1",
      turnNumber: 1,
      hasUsedSkipTrackWithTt: true,
    });
  });

  it("rejects a second skip in the same turn", () => {
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
          startingTtTokenCount: 0,
        },
      ],
      deck,
      targetTimelineCardCount: 4,
    });

    const skippedGameState = gameFlowService.skipCurrentTrackWithTt(gameState, "player-1");

    expect(() => gameFlowService.skipCurrentTrackWithTt(skippedGameState, "player-1")).toThrow(
      "SKIP_ALREADY_USED_THIS_TURN",
    );
  });

  it("rejects skip when the player does not have enough TT", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });

    expect(() => gameFlowService.skipCurrentTrackWithTt(gameState, "player-1")).toThrow(
      "INSUFFICIENT_TT",
    );
  });

  it("lets a player spend 3 TT to buy the current card directly into reveal", () => {
    const gameState = gameFlowService.startGame({
      players: [
        {
          id: "player-1",
          displayName: "Player 1",
          startingTimelineCardCount: 1,
          startingTtTokenCount: 3,
        },
        {
          id: "player-2",
          displayName: "Player 2",
          startingTimelineCardCount: 2,
          startingTtTokenCount: 0,
        },
      ],
      deck,
      targetTimelineCardCount: 4,
    });

    const boughtGameState = gameFlowService.buyTimelineCardWithTt(gameState, "player-1");

    expect(boughtGameState.phase).toBe("reveal");
    expect(boughtGameState.timelines["player-1"]).toEqual([
      {
        id: "track-1",
        releaseYear: 1990,
      },
      {
        id: "track-4",
        releaseYear: 2000,
      },
    ]);
    expect(boughtGameState.players.find((player) => player.id === "player-1")?.ttTokenCount).toBe(
      0,
    );
    expect(boughtGameState.currentTrackCard?.id).toBe("track-4");
    expect(boughtGameState.revealState).toEqual({
      playerId: "player-1",
      placedCard: {
        id: "track-4",
        releaseYear: 2000,
      },
      selectedSlotIndex: 1,
      wasCorrect: true,
      revealType: "tt_buy",
      validSlotIndexes: [1],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: "player-1",
      awardedSlotIndex: 1,
    });
  });

  it("rejects buying a timeline card when it is not your turn", () => {
    const gameState = gameFlowService.startGame({
      players: [
        {
          id: "player-1",
          displayName: "Player 1",
          startingTimelineCardCount: 1,
          startingTtTokenCount: 3,
        },
        {
          id: "player-2",
          displayName: "Player 2",
          startingTimelineCardCount: 2,
          startingTtTokenCount: 3,
        },
      ],
      deck,
      targetTimelineCardCount: 4,
    });

    expect(() => gameFlowService.buyTimelineCardWithTt(gameState, "player-2")).toThrow(
      "NOT_ACTIVE_PLAYER",
    );
  });

  it("enters reveal with a winner if buying a card reaches the target", () => {
    const gameState = gameFlowService.startGame({
      players: [
        {
          id: "player-1",
          displayName: "Player 1",
          startingTimelineCardCount: 1,
          startingTtTokenCount: 3,
        },
        {
          id: "player-2",
          displayName: "Player 2",
          startingTimelineCardCount: 2,
          startingTtTokenCount: 0,
        },
      ],
      deck,
      targetTimelineCardCount: 2,
    });

    const boughtGameState = gameFlowService.buyTimelineCardWithTt(gameState, "player-1");

    expect(boughtGameState.phase).toBe("reveal");
    expect(boughtGameState.winnerPlayerId).toBe("player-1");
    expect(boughtGameState.currentTrackCard?.id).toBe("track-4");
    expect(boughtGameState.turn).toEqual({
      activePlayerId: "player-1",
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
    });
  });

  it("refuses a zero or fractional TT award", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 4 });

    for (const tokenAmount of [0, 0.5]) {
      expect(() => gameFlowService.awardTtTokens(gameState, "player-2", tokenAmount)).toThrow(
        "INVALID_TT_AMOUNT",
      );
    }
  });

  it("lets the host take TT away, but never below zero", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-2": 2 }));

    const afterOneTaken = gameFlowService.awardTtTokens(gameState, "player-2", -1);
    const afterTooManyTaken = gameFlowService.awardTtTokens(afterOneTaken, "player-2", -3);

    expect(ttTokenCountOf(afterOneTaken, "player-2")).toBe(1);
    expect(ttTokenCountOf(afterTooManyTaken, "player-2")).toBe(0);
  });

  it("refuses to award TT to an unknown player", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 4 });

    expect(() => gameFlowService.awardTtTokens(gameState, "player-unknown", 1)).toThrow(
      "PLAYER_NOT_FOUND",
    );
  });

  it("refuses a TT skip or buy outside the turn phase", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-1": 3 }));
    const revealGameState = gameFlowService.placeCard(gameState, "player-1", 1);

    expect(() => gameFlowService.skipCurrentTrackWithTt(revealGameState, "player-1")).toThrow(
      "GAME_NOT_IN_TURN_PHASE",
    );
    expect(() => gameFlowService.buyTimelineCardWithTt(revealGameState, "player-1")).toThrow(
      "GAME_NOT_IN_TURN_PHASE",
    );
  });

  it("refuses a buy when the player holds fewer than 3 TT", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-1": 2 }));

    expect(() => gameFlowService.buyTimelineCardWithTt(gameState, "player-1")).toThrow(
      "INSUFFICIENT_TT",
    );
  });

  it("gives the next turn a fresh TT skip", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-1": 1 }));
    const skippedGameState = gameFlowService.skipCurrentTrackWithTt(gameState, "player-1");
    const nextTurnState = gameFlowService.confirmReveal(
      gameFlowService.placeCard(skippedGameState, "player-1", 0),
    );

    expect(nextTurnState.turn).toEqual({
      activePlayerId: "player-2",
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
    });
  });

  it("files a bought card at the first slot of a same-year block", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-1": 3 }));

    const boughtGameState = gameFlowService.buyTimelineCardWithTt(gameState, "player-1");

    expect(boughtGameState.revealState).toEqual(
      expect.objectContaining({ revealType: "tt_buy", awardedSlotIndex: 1 }),
    );
    expect(boughtGameState.timelines["player-1"]?.map((card) => card.id)).toEqual([
      "same-1",
      "same-5",
      "same-2",
      "same-3",
    ]);
  });
});
