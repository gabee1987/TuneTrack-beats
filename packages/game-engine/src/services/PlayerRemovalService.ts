import type { GameState } from "../domain/GameState.js";
import type { ChallengeFlowService } from "./ChallengeFlowService.js";
import { beginNextTurn, type ShuffleCards } from "./deckFlow.js";
import { findNextActivePlayerId } from "./gameFlowHelpers.js";

/**
 * Removing a player must never leave the turn, challenge, reveal or winner pointing at someone
 * who is gone; every later transition (timers included) looks those ids up.
 */
export class PlayerRemovalService {
  public constructor(
    private readonly challengeFlow: ChallengeFlowService,
    private readonly shuffleCards: ShuffleCards,
  ) {}

  public removePlayer(gameState: GameState, playerId: string): GameState {
    if (!gameState.players.some((player) => player.id === playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    return withoutPlayer(this.settleRoundWithoutPlayer(gameState, playerId), playerId);
  }

  private settleRoundWithoutPlayer(gameState: GameState, playerId: string): GameState {
    if (gameState.phase === "finished" || gameState.players.length === 1) {
      return gameState;
    }

    const { turn } = gameState;
    if (turn?.activePlayerId === playerId) {
      // The leaving player is dropped first so a deck-exhaustion finish cannot crown them.
      return isWonByAnotherPlayer(gameState, playerId)
        ? gameState
        : beginNextTurn(
            withoutPlayer(gameState, playerId),
            findNextActivePlayerId(gameState.players, playerId),
            this.shuffleCards,
          );
    }

    if (
      gameState.phase === "challenge" &&
      gameState.challengeState?.challengerPlayerId === playerId
    ) {
      return this.challengeFlow.resolveChallengeWindow({
        ...gameState,
        challengeState: {
          ...gameState.challengeState,
          phase: "open",
          challengerPlayerId: null,
          challengerSelectedSlotIndex: null,
        },
      });
    }

    return gameState;
  }
}

function isWonByAnotherPlayer(gameState: GameState, playerId: string): boolean {
  return (
    gameState.phase === "reveal" &&
    gameState.winnerPlayerId !== null &&
    gameState.winnerPlayerId !== playerId
  );
}

function withoutPlayer(gameState: GameState, playerId: string): GameState {
  const timelines = { ...gameState.timelines };
  delete timelines[playerId];

  return {
    ...gameState,
    players: gameState.players.filter((player) => player.id !== playerId),
    timelines,
    winnerPlayerId:
      gameState.phase !== "finished" && gameState.winnerPlayerId === playerId
        ? null
        : gameState.winnerPlayerId,
  };
}
