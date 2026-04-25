import { describe, expect, it } from "vitest";
import {
  GameFlowService,
  type GameTrackCard,
  type StartGamePlayerInput,
} from "../src/index.js";

const players: StartGamePlayerInput[] = [
  {
    id: "player-1",
    displayName: "Player 1",
    startingTimelineCardCount: 1,
    startingTtTokenCount: 0,
  },
  {
    id: "player-2",
    displayName: "Player 2",
    startingTimelineCardCount: 2,
    startingTtTokenCount: 0,
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

  function seedPlayerTokens(
    tokenOverrides: Record<string, number>,
  ): ReturnType<GameFlowService["startGame"]>["players"] {
    return players.map((player) => ({
      ...player,
      ttTokenCount: tokenOverrides[player.id] ?? 0,
    }));
  }

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

    const nextTurnState = gameFlowService.advanceTurnToPlayer(
      gameState,
      "player-2",
    );

    expect(nextTurnState.phase).toBe("turn");
    expect(nextTurnState.turn).toEqual({
      activePlayerId: "player-2",
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
    });
    expect(nextTurnState.currentTrackCard).toBe(gameState.currentTrackCard);
    expect(nextTurnState.deck).toEqual(gameState.deck);
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

  it("opens a challenge window instead of reveal when challenge mode is enabled", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });

    const challengeState = gameFlowService.placeCard(gameState, "player-1", 1, {
      challengeEnabled: true,
      challengeDeadlineEpochMs: 123_456,
    });

    expect(challengeState.phase).toBe("challenge");
    expect(challengeState.revealState).toBeNull();
    expect(challengeState.challengeState).toEqual({
      phase: "open",
      originalPlayerId: "player-1",
      originalSelectedSlotIndex: 1,
      placedCard: {
        id: "track-4",
        releaseYear: 2000,
      },
      originalWasCorrect: true,
      originalValidSlotIndexes: [1],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeDeadlineEpochMs: 123_456,
    });
    expect(challengeState.timelines["player-1"]).toEqual([
      {
        id: "track-1",
        releaseYear: 1990,
      },
    ]);
  });

  it("lets the first challenger claim the challenge and rejects a second claim", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });
    const openChallengeState = {
      ...gameFlowService.placeCard(gameState, "player-1", 1, {
        challengeEnabled: true,
      }),
      players: seedPlayerTokens({
        "player-2": 1,
      }),
    };
    const claimedChallengeState = gameFlowService.claimChallenge(
      openChallengeState,
      "player-2",
    );

    expect(claimedChallengeState.challengeState).toEqual(
      expect.objectContaining({
        phase: "claimed",
        challengerPlayerId: "player-2",
      }),
    );
    expect(() =>
      gameFlowService.claimChallenge(claimedChallengeState, "player-1"),
    ).toThrow("ACTIVE_PLAYER_CANNOT_CHALLENGE");
    expect(() =>
      gameFlowService.claimChallenge(claimedChallengeState, "player-2"),
    ).toThrow("CHALLENGE_ALREADY_CLAIMED");
  });

  it("rejects challenge claims when the challenger has no TT left", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });
    const openChallengeState = gameFlowService.placeCard(gameState, "player-1", 1, {
      challengeEnabled: true,
    });

    expect(() =>
      gameFlowService.claimChallenge(openChallengeState, "player-2"),
    ).toThrow("INSUFFICIENT_TT");
  });

  it("resolves a successful challenge, inserts the challenger slot, and awards TT", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });
    const openChallengeState = {
      ...gameFlowService.placeCard(gameState, "player-1", 0, {
        challengeEnabled: true,
      }),
      players: seedPlayerTokens({
        "player-2": 1,
      }),
    };
    const claimedChallengeState = gameFlowService.claimChallenge(
      openChallengeState,
      "player-2",
    );
    const revealGameState = gameFlowService.placeChallengeCard(
      claimedChallengeState,
      "player-2",
      1,
    );

    expect(revealGameState.phase).toBe("reveal");
    expect(revealGameState.challengeState).toBeNull();
    expect(revealGameState.revealState).toEqual({
      playerId: "player-1",
      placedCard: {
        id: "track-4",
        releaseYear: 2000,
      },
      selectedSlotIndex: 0,
      wasCorrect: false,
      revealType: "placement",
      validSlotIndexes: [1],
      challengerPlayerId: "player-2",
      challengerSelectedSlotIndex: 1,
      challengeWasSuccessful: true,
      challengerTtChange: 1,
      awardedPlayerId: "player-2",
      awardedSlotIndex: 1,
    });
    expect(revealGameState.timelines["player-1"]).toEqual([
      {
        id: "track-1",
        releaseYear: 1990,
      },
    ]);
    expect(revealGameState.timelines["player-2"]).toEqual([
      {
        id: "track-3",
        releaseYear: 1985,
      },
      {
        id: "track-4",
        releaseYear: 2000,
      },
      {
        id: "track-2",
        releaseYear: 2005,
      },
    ]);
    expect(
      revealGameState.players.find((player) => player.id === "player-2")
        ?.ttTokenCount,
    ).toBe(2);
  });

  it("resolves a failed challenge and deducts TT from the challenger", () => {
    const preparedGameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });
    const seededTokenState = {
      ...preparedGameState,
      players: preparedGameState.players.map((player) =>
        player.id === "player-2"
          ? { ...player, ttTokenCount: 2 }
          : player,
      ),
    };
    const openChallengeState = gameFlowService.placeCard(
      seededTokenState,
      "player-1",
      1,
      {
        challengeEnabled: true,
      },
    );
    const claimedChallengeState = gameFlowService.claimChallenge(
      openChallengeState,
      "player-2",
    );
    const revealGameState = gameFlowService.placeChallengeCard(
      claimedChallengeState,
      "player-2",
      0,
    );

    expect(revealGameState.revealState).toEqual(
      expect.objectContaining({
        wasCorrect: true,
        revealType: "placement",
        challengeWasSuccessful: false,
        challengerTtChange: -1,
        awardedPlayerId: "player-1",
        awardedSlotIndex: 1,
      }),
    );
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
    expect(
      revealGameState.players.find((player) => player.id === "player-2")
        ?.ttTokenCount,
    ).toBe(1);
  });

  it("never lets TT drop below zero on a failed challenge", () => {
    const preparedGameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });
    const seededTokenState = {
      ...preparedGameState,
      players: seedPlayerTokens({
        "player-2": 1,
      }),
    };
    const openChallengeState = gameFlowService.placeCard(
      seededTokenState,
      "player-1",
      1,
      {
        challengeEnabled: true,
      },
    );
    const claimedChallengeState = gameFlowService.claimChallenge(
      openChallengeState,
      "player-2",
    );
    const revealGameState = gameFlowService.placeChallengeCard(
      claimedChallengeState,
      "player-2",
      0,
    );

    expect(
      revealGameState.players.find((player) => player.id === "player-2")
        ?.ttTokenCount,
    ).toBe(0);
  });

  it("rejects a Beat! slot that matches the original player's chosen slot", () => {
    const preparedGameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });
    const seededTokenState = {
      ...preparedGameState,
      players: seedPlayerTokens({
        "player-2": 1,
      }),
    };
    const openChallengeState = gameFlowService.placeCard(
      seededTokenState,
      "player-1",
      0,
      {
        challengeEnabled: true,
      },
    );
    const claimedChallengeState = gameFlowService.claimChallenge(
      openChallengeState,
      "player-2",
    );

    expect(() =>
      gameFlowService.placeChallengeCard(
        claimedChallengeState,
        "player-2",
        0,
      ),
    ).toThrow("CHALLENGE_SLOT_MUST_DIFFER");
  });

  it("lets the host award TT manually during a game", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });

    const updatedGameState = gameFlowService.awardTtTokens(
      gameState,
      "player-2",
      1,
    );

    expect(
      updatedGameState.players.find((player) => player.id === "player-2")
        ?.ttTokenCount,
    ).toBe(1);
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

    const updatedGameState = gameFlowService.awardTtTokens(
      gameState,
      "player-1",
      1,
    );

    expect(
      updatedGameState.players.find((player) => player.id === "player-1")
        ?.ttTokenCount,
    ).toBe(5);
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

    const skippedGameState = gameFlowService.skipCurrentTrackWithTt(
      gameState,
      "player-1",
    );

    expect(skippedGameState.currentTrackCard?.id).toBe("track-5");
    expect(
      skippedGameState.players.find((player) => player.id === "player-1")
        ?.ttTokenCount,
    ).toBe(0);
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

    const skippedGameState = gameFlowService.skipCurrentTrackWithTt(
      gameState,
      "player-1",
    );

    expect(() =>
      gameFlowService.skipCurrentTrackWithTt(skippedGameState, "player-1"),
    ).toThrow("SKIP_ALREADY_USED_THIS_TURN");
  });

  it("rejects skip when the player does not have enough TT", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 4,
    });

    expect(() =>
      gameFlowService.skipCurrentTrackWithTt(gameState, "player-1"),
    ).toThrow("INSUFFICIENT_TT");
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

    const boughtGameState = gameFlowService.buyTimelineCardWithTt(
      gameState,
      "player-1",
    );

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
    expect(
      boughtGameState.players.find((player) => player.id === "player-1")
        ?.ttTokenCount,
    ).toBe(0);
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

    expect(() =>
      gameFlowService.buyTimelineCardWithTt(gameState, "player-2"),
    ).toThrow("NOT_ACTIVE_PLAYER");
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

    const boughtGameState = gameFlowService.buyTimelineCardWithTt(
      gameState,
      "player-1",
    );

    expect(boughtGameState.phase).toBe("reveal");
    expect(boughtGameState.winnerPlayerId).toBe("player-1");
    expect(boughtGameState.currentTrackCard?.id).toBe("track-4");
    expect(boughtGameState.turn).toEqual({
      activePlayerId: "player-1",
      turnNumber: 1,
      hasUsedSkipTrackWithTt: false,
    });
  });

  it("resolves the original placement when nobody claims the challenge", () => {
    const gameState = gameFlowService.startGame({
      players,
      deck,
      targetTimelineCardCount: 3,
    });
    const openChallengeState = gameFlowService.placeCard(gameState, "player-1", 1, {
      challengeEnabled: true,
    });
    const revealGameState =
      gameFlowService.resolveChallengeWindow(openChallengeState);

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
  });
});
