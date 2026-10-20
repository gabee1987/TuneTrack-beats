import { describe, expect, it } from "vitest";
import {
  GameFlowService,
  type GameState,
  type GameTrackCard,
  type StartGamePlayerInput,
} from "../src/index.js";

const players: StartGamePlayerInput[] = [
  {
    id: "player-1",
    displayName: "Player One",
    startingTimelineCardCount: 1,
    startingTtTokenCount: 0,
  },
  {
    id: "player-2",
    displayName: "Player Two",
    startingTimelineCardCount: 1,
    startingTtTokenCount: 1,
  },
  {
    id: "player-3",
    displayName: "Player Three",
    startingTimelineCardCount: 1,
    startingTtTokenCount: 0,
  },
];

function buildTrack(id: string, releaseYear: number): GameTrackCard {
  return { id, title: `Song ${id}`, artist: "Test Artist", albumTitle: "Test Album", releaseYear };
}

// Starting cards are drawn in player order: player-1 1990, player-2 2005, player-3 1985.
// The first turn card is 2000; the next draws are 1975 and 2010.
const deck: GameTrackCard[] = [
  buildTrack("track-1", 1990),
  buildTrack("track-2", 2005),
  buildTrack("track-3", 1985),
  buildTrack("track-4", 2000),
  buildTrack("track-5", 1975),
  buildTrack("track-6", 2010),
];

const CORRECT_SLOT = 1;
const WRONG_SLOT = 0;

describe("GameFlowService.removePlayer", () => {
  const gameFlowService = new GameFlowService();

  function startGame(targetTimelineCardCount = 10): GameState {
    return gameFlowService.startGame({ players, deck, targetTimelineCardCount });
  }

  function openChallenge(selectedSlotIndex: number, targetTimelineCardCount = 10): GameState {
    return gameFlowService.placeCard(
      startGame(targetTimelineCardCount),
      "player-1",
      selectedSlotIndex,
      {
        challengeEnabled: true,
        challengeDeadlineEpochMs: 12345,
      },
    );
  }

  function claimedChallenge(selectedSlotIndex: number, targetTimelineCardCount = 10): GameState {
    return gameFlowService.claimChallenge(
      openChallenge(selectedSlotIndex, targetTimelineCardCount),
      "player-2",
      0,
    );
  }

  it("passes the turn to the next player and draws a new card when the active player is removed", () => {
    const gameState = gameFlowService.removePlayer(startGame(), "player-1");

    expect(gameState.phase).toBe("turn");
    expect(gameState.turn).toMatchObject({ activePlayerId: "player-2", turnNumber: 2 });
    expect(gameState.currentTrackCard?.id).toBe("track-5");
    expect(gameState.players.map((player) => player.id)).toEqual(["player-2", "player-3"]);
    expect(gameState.timelines["player-1"]).toBeUndefined();
  });

  it("keeps the current turn when a waiting player is removed", () => {
    const gameState = gameFlowService.removePlayer(startGame(), "player-3");

    expect(gameState.turn).toMatchObject({ activePlayerId: "player-1", turnNumber: 1 });
    expect(gameState.currentTrackCard?.id).toBe("track-4");
  });

  it("ends an open challenge window and moves on when the placing player is removed", () => {
    const gameState = gameFlowService.removePlayer(openChallenge(CORRECT_SLOT), "player-1");

    expect(gameState.phase).toBe("turn");
    expect(gameState.challengeState).toBeNull();
    expect(gameState.turn?.activePlayerId).toBe("player-2");
    expect(() => gameFlowService.resolveChallengeWindow(gameState)).toThrow(
      "GAME_NOT_IN_CHALLENGE_PHASE",
    );
  });

  it("ends a claimed challenge without charging the challenger when the placing player is removed", () => {
    const gameState = gameFlowService.removePlayer(claimedChallenge(WRONG_SLOT), "player-1");

    expect(gameState.phase).toBe("turn");
    expect(gameState.turn?.activePlayerId).toBe("player-2");
    expect(gameState.players.find((player) => player.id === "player-2")?.ttTokenCount).toBe(1);
  });

  it("lets the original placement stand when the challenger is removed", () => {
    const gameState = gameFlowService.removePlayer(claimedChallenge(CORRECT_SLOT), "player-2");

    expect(gameState.phase).toBe("reveal");
    expect(gameState.revealState).toMatchObject({
      playerId: "player-1",
      wasCorrect: true,
      challengerPlayerId: null,
      awardedPlayerId: "player-1",
    });
    expect(gameState.timelines["player-1"]).toHaveLength(2);
  });

  it("removes a bystander during a challenge without touching the challenge", () => {
    const before = claimedChallenge(CORRECT_SLOT);

    const gameState = gameFlowService.removePlayer(before, "player-3");

    expect(gameState.phase).toBe("challenge");
    expect(gameState.challengeState).toEqual(before.challengeState);
  });

  it("moves on from the reveal when the revealed player is removed", () => {
    const reveal = gameFlowService.placeCard(startGame(), "player-1", CORRECT_SLOT);

    const gameState = gameFlowService.removePlayer(reveal, "player-1");

    expect(gameState.phase).toBe("turn");
    expect(gameState.revealState).toBeNull();
    expect(gameState.turn).toMatchObject({ activePlayerId: "player-2", turnNumber: 2 });
  });

  it("keeps the reveal confirmable when a waiting player is removed", () => {
    const reveal = gameFlowService.placeCard(startGame(), "player-1", CORRECT_SLOT);

    const gameState = gameFlowService.confirmReveal(
      gameFlowService.removePlayer(reveal, "player-3"),
    );

    expect(gameState.turn?.activePlayerId).toBe("player-2");
  });

  it("clears the win and continues the game when the winning challenger is removed during the reveal", () => {
    const reveal = gameFlowService.placeChallengeCard(
      claimedChallenge(WRONG_SLOT, 2),
      "player-2",
      CORRECT_SLOT,
    );
    expect(reveal.winnerPlayerId).toBe("player-2");

    const gameState = gameFlowService.confirmReveal(
      gameFlowService.removePlayer(reveal, "player-2"),
    );

    expect(gameState.phase).toBe("turn");
    expect(gameState.winnerPlayerId).toBeNull();
    expect(gameState.turn?.activePlayerId).toBe("player-3");
  });

  it("still finishes the game for the winner when the revealed player is removed", () => {
    const reveal = gameFlowService.placeChallengeCard(
      claimedChallenge(WRONG_SLOT, 2),
      "player-2",
      CORRECT_SLOT,
    );

    const afterRemoval = gameFlowService.removePlayer(reveal, "player-1");
    const gameState = gameFlowService.confirmReveal(afterRemoval);

    expect(afterRemoval.phase).toBe("reveal");
    expect(gameState.phase).toBe("finished");
    expect(gameState.winnerPlayerId).toBe("player-2");
  });

  it("removes the last remaining player without throwing", () => {
    const solo = gameFlowService.startGame({
      players: [players[0]!],
      deck,
      targetTimelineCardCount: 10,
    });

    const gameState = gameFlowService.removePlayer(solo, "player-1");

    expect(gameState.players).toEqual([]);
  });
});
