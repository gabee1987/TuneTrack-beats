import { describe, expect, it } from "vitest";
import { GameFlowService } from "../src/index.js";
import {
  deck,
  players,
  sameYearGameInput,
  seedPlayerTokens,
  ttTokenCountOf,
} from "./fixtures/twoPlayerGame.js";

describe("challenge flow", () => {
  const gameFlowService = new GameFlowService();

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
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);

    expect(claimedChallengeState.challengeState).toEqual(
      expect.objectContaining({
        phase: "claimed",
        challengerPlayerId: "player-2",
      }),
    );
    expect(() => gameFlowService.claimChallenge(claimedChallengeState, "player-1", 0)).toThrow(
      "ACTIVE_PLAYER_CANNOT_CHALLENGE",
    );
    expect(() => gameFlowService.claimChallenge(claimedChallengeState, "player-2", 0)).toThrow(
      "CHALLENGE_ALREADY_CLAIMED",
    );
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

    expect(() => gameFlowService.claimChallenge(openChallengeState, "player-2", 0)).toThrow(
      "INSUFFICIENT_TT",
    );
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
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);
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
      challengerTtChange: -1,
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
    expect(revealGameState.players.find((player) => player.id === "player-2")?.ttTokenCount).toBe(
      0,
    );
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
        player.id === "player-2" ? { ...player, ttTokenCount: 2 } : player,
      ),
    };
    const openChallengeState = gameFlowService.placeCard(seededTokenState, "player-1", 1, {
      challengeEnabled: true,
    });
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);
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
    expect(revealGameState.players.find((player) => player.id === "player-2")?.ttTokenCount).toBe(
      1,
    );
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
    const openChallengeState = gameFlowService.placeCard(seededTokenState, "player-1", 1, {
      challengeEnabled: true,
    });
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);
    const revealGameState = gameFlowService.placeChallengeCard(
      claimedChallengeState,
      "player-2",
      0,
    );

    expect(revealGameState.players.find((player) => player.id === "player-2")?.ttTokenCount).toBe(
      0,
    );
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
    const openChallengeState = gameFlowService.placeCard(seededTokenState, "player-1", 0, {
      challengeEnabled: true,
    });
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);

    expect(() => gameFlowService.placeChallengeCard(claimedChallengeState, "player-2", 0)).toThrow(
      "CHALLENGE_SLOT_MUST_DIFFER",
    );
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
    const revealGameState = gameFlowService.resolveChallengeWindow(openChallengeState);

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

  /** player-1 places the 2000 card at `originalSlotIndex`; player-2 claims the challenge. */
  function claimSameYearChallenge(originalSlotIndex: number) {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-2": 2 }));
    const openChallengeState = gameFlowService.placeCard(gameState, "player-1", originalSlotIndex, {
      challengeEnabled: true,
    });

    return gameFlowService.claimChallenge(openChallengeState, "player-2", 0);
  }

  it("lets the original placement stand when both pick a slot inside the same-year block", () => {
    const revealGameState = gameFlowService.placeChallengeCard(
      claimSameYearChallenge(1),
      "player-2",
      3,
    );

    expect(revealGameState.revealState).toEqual(
      expect.objectContaining({
        wasCorrect: true,
        validSlotIndexes: [1, 2, 3],
        challengerSelectedSlotIndex: 3,
        challengeWasSuccessful: false,
        challengerTtChange: -1,
        awardedPlayerId: "player-1",
        awardedSlotIndex: 1,
      }),
    );
    expect(revealGameState.timelines["player-1"]?.map((card) => card.id)).toEqual([
      "same-1",
      "same-5",
      "same-2",
      "same-3",
    ]);
    expect(revealGameState.timelines["player-2"]?.map((card) => card.id)).toEqual(["same-4"]);
    expect(ttTokenCountOf(revealGameState, "player-2")).toBe(1);
  });

  it("steals a missed card when the challenger lands inside the same-year block", () => {
    const revealGameState = gameFlowService.placeChallengeCard(
      claimSameYearChallenge(0),
      "player-2",
      2,
    );

    expect(revealGameState.revealState).toEqual(
      expect.objectContaining({
        wasCorrect: false,
        challengeWasSuccessful: true,
        awardedPlayerId: "player-2",
        awardedSlotIndex: 1,
      }),
    );
    expect(revealGameState.timelines["player-1"]?.map((card) => card.id)).toEqual([
      "same-1",
      "same-2",
      "same-3",
    ]);
    expect(revealGameState.timelines["player-2"]?.map((card) => card.id)).toEqual([
      "same-4",
      "same-5",
    ]);
  });

  it("refuses a challenge claim outside the challenge phase", () => {
    const gameState = gameFlowService.startGame(sameYearGameInput({ "player-2": 2 }));

    expect(() => gameFlowService.claimChallenge(gameState, "player-2", 0)).toThrow(
      "GAME_NOT_IN_CHALLENGE_PHASE",
    );
  });

  it("lets only the claiming challenger place the challenge card", () => {
    expect(() =>
      gameFlowService.placeChallengeCard(claimSameYearChallenge(1), "player-1", 3),
    ).toThrow("ONLY_CHALLENGE_OWNER_CAN_PLACE");
  });

  it("rejects a challenge slot outside the original player's timeline", () => {
    const claimedChallengeState = claimSameYearChallenge(1);

    for (const slotIndex of [-1, 4]) {
      expect(() =>
        gameFlowService.placeChallengeCard(claimedChallengeState, "player-2", slotIndex),
      ).toThrow("INVALID_SLOT_INDEX");
    }
  });

  it("refuses to auto-resolve a window someone has claimed", () => {
    expect(() => gameFlowService.resolveChallengeWindow(claimSameYearChallenge(1))).toThrow(
      "CHALLENGE_ALREADY_CLAIMED",
    );
  });

  it("discards a missed placement when nobody claims the challenge", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 3 });
    const openChallengeState = gameFlowService.placeCard(gameState, "player-1", 0, {
      challengeEnabled: true,
    });

    const revealGameState = gameFlowService.resolveChallengeWindow(openChallengeState);

    expect(revealGameState.revealState).toEqual(
      expect.objectContaining({ wasCorrect: false, awardedPlayerId: null, awardedSlotIndex: null }),
    );
    expect(revealGameState.timelines["player-1"]?.map((card) => card.id)).toEqual(["track-1"]);
    expect(
      gameFlowService.confirmReveal(revealGameState).discardPile.map((card) => card.id),
    ).toEqual(["track-4"]);
  });

  it("crowns the challenger when the stolen card reaches the target", () => {
    const gameState = gameFlowService.startGame({ players, deck, targetTimelineCardCount: 3 });
    const openChallengeState = {
      ...gameFlowService.placeCard(gameState, "player-1", 0, { challengeEnabled: true }),
      players: seedPlayerTokens({ "player-2": 1 }),
    };
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);
    const revealGameState = gameFlowService.placeChallengeCard(
      claimedChallengeState,
      "player-2",
      1,
    );

    expect(revealGameState.winnerPlayerId).toBe("player-2");
    expect(gameFlowService.confirmReveal(revealGameState).phase).toBe("finished");
  });
});
