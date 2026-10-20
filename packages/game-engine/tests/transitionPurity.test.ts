import { describe, expect, it } from "vitest";
import {
  GameFlowService,
  type GameState,
  type GameTrackCard,
  type StartGameInput,
} from "../src/index.js";

function buildTrack(id: string, releaseYear: number): GameTrackCard {
  return { id, title: `Song ${id}`, artist: "Test Artist", albumTitle: "Test Album", releaseYear };
}

// Starting cards: player-1 1990, player-2 2005, player-3 1985. The first turn card is 2000.
const startGameInput: StartGameInput = {
  players: ["player-1", "player-2", "player-3"].map((id) => ({
    id,
    displayName: id,
    startingTimelineCardCount: 1,
    startingTtTokenCount: 3,
  })),
  deck: [1990, 2005, 1985, 2000, 1975, 2010, 1995, 1980].map((releaseYear, index) =>
    buildTrack(`track-${index + 1}`, releaseYear),
  ),
  targetTimelineCardCount: 10,
};

const DEADLINE_EPOCH_MS = 12345;

function expectInputUntouched<T>(input: T, transition: (input: T) => GameState): GameState {
  const snapshot = structuredClone(input);
  const result = transition(input);
  expect(input).toEqual(snapshot);
  return result;
}

describe("engine transitions leave their input untouched", () => {
  const gameFlowService = new GameFlowService();
  const startedState = expectInputUntouched(startGameInput, (input) =>
    gameFlowService.startGame(input),
  );
  const openChallengeState = gameFlowService.placeCard(startedState, "player-1", 0, {
    challengeEnabled: true,
    challengeDeadlineEpochMs: DEADLINE_EPOCH_MS,
  });
  const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);
  const revealState = gameFlowService.placeCard(startedState, "player-1", 0);

  const transitions: Array<[string, GameState, (gameState: GameState) => GameState]> = [
    ["placeCard", startedState, (state) => gameFlowService.placeCard(state, "player-1", 1)],
    ["confirmReveal", revealState, (state) => gameFlowService.confirmReveal(state)],
    [
      "skipTurnToPlayer",
      startedState,
      (state) => gameFlowService.skipTurnToPlayer(state, "player-3"),
    ],
    [
      "skipOfflinePlayerTurn",
      startedState,
      (state) => gameFlowService.skipOfflinePlayerTurn(state),
    ],
    ["skipTurn", claimedChallengeState, (state) => gameFlowService.skipTurn(state, null)],
    [
      "advanceTurnToPlayer",
      startedState,
      (state) => gameFlowService.advanceTurnToPlayer(state, "player-2"),
    ],
    [
      "skipCurrentTrackWithTt",
      startedState,
      (state) => gameFlowService.skipCurrentTrackWithTt(state, "player-1"),
    ],
    [
      "buyTimelineCardWithTt",
      startedState,
      (state) => gameFlowService.buyTimelineCardWithTt(state, "player-1"),
    ],
    ["awardTtTokens", startedState, (state) => gameFlowService.awardTtTokens(state, "player-3", 1)],
    [
      "claimChallenge",
      openChallengeState,
      (state) => gameFlowService.claimChallenge(state, "player-2", 0),
    ],
    [
      "placeChallengeCard",
      claimedChallengeState,
      (state) => gameFlowService.placeChallengeCard(state, "player-2", 1),
    ],
    [
      "resolveChallengeWindow",
      openChallengeState,
      (state) => gameFlowService.resolveChallengeWindow(state),
    ],
    [
      "cancelClaimedChallengeForOfflineChallenger",
      claimedChallengeState,
      (state) => gameFlowService.cancelClaimedChallengeForOfflineChallenger(state),
    ],
    [
      "removePlayer (active)",
      startedState,
      (state) => gameFlowService.removePlayer(state, "player-1"),
    ],
    [
      "removePlayer (challenger)",
      claimedChallengeState,
      (state) => gameFlowService.removePlayer(state, "player-2"),
    ],
  ];

  it.each(transitions)("%s", (_name, gameState, transition) => {
    expectInputUntouched(gameState, transition);
  });
});

describe("engine-owned clock and skip rules", () => {
  const gameFlowService = new GameFlowService();
  const startedState = gameFlowService.startGame(startGameInput);
  const openChallengeState = gameFlowService.placeCard(startedState, "player-1", 0, {
    challengeEnabled: true,
    challengeDeadlineEpochMs: DEADLINE_EPOCH_MS,
  });

  it("refuses a challenge claim at or after the deadline", () => {
    expect(() =>
      gameFlowService.claimChallenge(openChallengeState, "player-2", DEADLINE_EPOCH_MS),
    ).toThrow("CHALLENGE_WINDOW_EXPIRED");
    expect(
      gameFlowService.claimChallenge(openChallengeState, "player-2", DEADLINE_EPOCH_MS - 1)
        .challengeState?.challengerPlayerId,
    ).toBe("player-2");
  });

  it("cancels a claimed challenge on a host skip and moves to the next seat", () => {
    const claimedChallengeState = gameFlowService.claimChallenge(openChallengeState, "player-2", 0);

    const skippedState = gameFlowService.skipTurn(claimedChallengeState, "player-3");

    expect(skippedState.phase).toBe("turn");
    expect(skippedState.challengeState).toBeNull();
    expect(skippedState.turn?.activePlayerId).toBe("player-2");
  });

  it("passes a skipped turn to the connected player, or to the next seat when none is", () => {
    expect(gameFlowService.skipTurn(startedState, "player-3").turn?.activePlayerId).toBe(
      "player-3",
    );
    expect(gameFlowService.skipTurn(startedState, null).turn?.activePlayerId).toBe("player-2");
  });

  it("refuses a host skip outside a turn or a claimed challenge", () => {
    expect(() => gameFlowService.skipTurn(openChallengeState, null)).toThrow(
      "GAME_NOT_IN_TURN_PHASE",
    );
  });
});
