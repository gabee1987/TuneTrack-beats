import type { ChallengeState } from "../domain/ChallengeState.js";
import type { GameState } from "../domain/GameState.js";
import type { RevealState } from "../domain/RevealState.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import { evaluateTimelinePlacement } from "../rules/placementRules.js";
import {
  drawNextCard,
  drawStartingTimelineCards,
  findNextActivePlayerId,
  insertTimelineCard,
  validateStartGameInput,
} from "./gameFlowHelpers.js";
import type { PlaceCardOptions, StartGameInput } from "./gameFlowTypes.js";

export class TurnFlowService {
  public startGame(startGameInput: StartGameInput): GameState {
    validateStartGameInput(startGameInput);

    const firstPlayer = startGameInput.players[0];

    if (!firstPlayer) {
      throw new Error("NOT_ENOUGH_PLAYERS");
    }

    const deck = [...startGameInput.deck];
    const timelines: Record<string, TimelineCard[]> = {};

    for (const player of startGameInput.players) {
      timelines[player.id] = drawStartingTimelineCards(
        deck,
        player.startingTimelineCardCount,
      );
    }

    return {
      phase: "turn",
      players: startGameInput.players.map((player) => ({
        ...player,
        ttTokenCount: player.startingTtTokenCount,
      })),
      timelines,
      deck,
      currentTrackCard: drawNextCard(deck),
      turn: {
        activePlayerId: firstPlayer.id,
        turnNumber: 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
      history: [],
      winnerPlayerId: null,
      targetTimelineCardCount: startGameInput.targetTimelineCardCount,
    };
  }

  public placeCard(
    gameState: GameState,
    playerId: string,
    selectedSlotIndex: number,
    placeCardOptions: PlaceCardOptions = {},
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new Error("NOT_ACTIVE_PLAYER");
    }

    if (!gameState.currentTrackCard) {
      throw new Error("CURRENT_CARD_NOT_AVAILABLE");
    }

    const playerTimeline = gameState.timelines[playerId];

    if (!playerTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    if (!Number.isInteger(selectedSlotIndex) || selectedSlotIndex < 0) {
      throw new Error("INVALID_SLOT_INDEX");
    }

    if (selectedSlotIndex > playerTimeline.length) {
      throw new Error("INVALID_SLOT_INDEX");
    }

    const placementResult = evaluateTimelinePlacement(
      playerTimeline,
      gameState.currentTrackCard.releaseYear,
      selectedSlotIndex,
    );
    const placedCard: TimelineCard = {
      id: gameState.currentTrackCard.id,
      releaseYear: gameState.currentTrackCard.releaseYear,
    };

    if (placeCardOptions.challengeEnabled) {
      const challengeState: ChallengeState = {
        phase: "open",
        originalPlayerId: playerId,
        originalSelectedSlotIndex: selectedSlotIndex,
        placedCard,
        originalWasCorrect: placementResult.isCorrect,
        originalValidSlotIndexes: placementResult.validSlotIndexes,
        challengerPlayerId: null,
        challengerSelectedSlotIndex: null,
        challengeDeadlineEpochMs:
          placeCardOptions.challengeDeadlineEpochMs ?? null,
      };

      return {
        ...gameState,
        phase: "challenge",
        challengeState,
        revealState: null,
      };
    }

    const nextTimeline = placementResult.isCorrect
      ? insertTimelineCard(playerTimeline, selectedSlotIndex, placedCard)
      : [...playerTimeline];
    const nextTimelines = {
      ...gameState.timelines,
      [playerId]: nextTimeline,
    };
    const revealState: RevealState = {
      playerId,
      placedCard,
      selectedSlotIndex,
      wasCorrect: placementResult.isCorrect,
      revealType: "placement",
      validSlotIndexes: placementResult.validSlotIndexes,
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: placementResult.isCorrect ? playerId : null,
      awardedSlotIndex: placementResult.isCorrect ? selectedSlotIndex : null,
    };

    return {
      ...gameState,
      phase: "reveal",
      timelines: nextTimelines,
      challengeState: null,
      revealState,
      history: [...gameState.history, revealState],
      winnerPlayerId:
        placementResult.isCorrect &&
        nextTimeline.length >= gameState.targetTimelineCardCount
          ? playerId
          : null,
    };
  }

  public confirmReveal(gameState: GameState): GameState {
    if (gameState.phase !== "reveal" || !gameState.turn || !gameState.revealState) {
      throw new Error("GAME_NOT_IN_REVEAL_PHASE");
    }

    if (gameState.winnerPlayerId) {
      return {
        ...gameState,
        phase: "finished",
        currentTrackCard: null,
        turn: null,
        revealState: null,
      };
    }

    return {
      ...gameState,
      phase: "turn",
      currentTrackCard: drawNextCard(gameState.deck),
      turn: {
        activePlayerId: findNextActivePlayerId(
          gameState.players,
          gameState.turn.activePlayerId,
        ),
        turnNumber: gameState.turn.turnNumber + 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public advanceTurnToPlayer(
    gameState: GameState,
    nextActivePlayerId: string,
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (!gameState.players.some((player) => player.id === nextActivePlayerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    if (gameState.turn.activePlayerId === nextActivePlayerId) {
      throw new Error("ACTIVE_PLAYER_UNCHANGED");
    }

    return {
      ...gameState,
      turn: {
        activePlayerId: nextActivePlayerId,
        turnNumber: gameState.turn.turnNumber + 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public removePlayer(gameState: GameState, playerId: string): GameState {
    if (!gameState.players.some((player) => player.id === playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const players = gameState.players.filter((player) => player.id !== playerId);
    const timelines = { ...gameState.timelines };
    delete timelines[playerId];

    return {
      ...gameState,
      players,
      timelines,
    };
  }

  public skipOfflinePlayerTurn(gameState: GameState): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    const nextActivePlayerId = findNextActivePlayerId(
      gameState.players,
      gameState.turn.activePlayerId,
    );

    return this.skipTurnToPlayer(gameState, nextActivePlayerId);
  }

  public skipTurnToPlayer(gameState: GameState, nextActivePlayerId: string): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (!gameState.players.some((player) => player.id === nextActivePlayerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    return {
      ...gameState,
      turn: {
        activePlayerId: nextActivePlayerId,
        turnNumber: gameState.turn.turnNumber + 1,
        hasUsedSkipTrackWithTt: false,
      },
      challengeState: null,
      revealState: null,
      currentTrackCard: drawNextCard(gameState.deck),
    };
  }
}
