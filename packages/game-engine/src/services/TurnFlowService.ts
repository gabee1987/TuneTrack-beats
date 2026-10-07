import { GameRuleError } from "../domain/GameRuleError.js";
import type { ChallengeState } from "../domain/ChallengeState.js";
import type { GameState } from "../domain/GameState.js";
import type { RevealState } from "../domain/RevealState.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import { evaluateTimelinePlacement } from "../rules/placementRules.js";
import { beginNextTurn, beginTurnOfNextPlayer, type ShuffleCards } from "./deckFlow.js";
import { insertTimelineCard, validateStartGameInput } from "./gameFlowHelpers.js";
import type { PlaceCardOptions, StartGameInput } from "./gameFlowTypes.js";

export class TurnFlowService {
  public constructor(private readonly shuffleCards: ShuffleCards) {}

  public startGame(startGameInput: StartGameInput): GameState {
    validateStartGameInput(startGameInput);

    const firstPlayer = startGameInput.players[0];

    if (!firstPlayer) {
      throw new GameRuleError("NOT_ENOUGH_PLAYERS");
    }

    let deck = startGameInput.deck;
    const timelines: Record<string, TimelineCard[]> = {};

    for (const player of startGameInput.players) {
      timelines[player.id] = deck
        .slice(0, player.startingTimelineCardCount)
        .map((card) => ({ id: card.id, releaseYear: card.releaseYear }))
        .sort((leftCard, rightCard) => leftCard.releaseYear - rightCard.releaseYear);
      deck = deck.slice(player.startingTimelineCardCount);
    }

    const [currentTrackCard = null, ...remainingDeck] = deck;

    return {
      phase: "turn",
      players: startGameInput.players.map((player) => ({
        ...player,
        ttTokenCount: player.startingTtTokenCount,
      })),
      timelines,
      deck: remainingDeck,
      discardPile: [],
      currentTrackCard,
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
      throw new GameRuleError("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new GameRuleError("NOT_ACTIVE_PLAYER");
    }

    if (!gameState.currentTrackCard) {
      throw new GameRuleError("CURRENT_CARD_NOT_AVAILABLE");
    }

    const playerTimeline = gameState.timelines[playerId];

    if (!playerTimeline) {
      throw new GameRuleError("PLAYER_TIMELINE_NOT_FOUND");
    }

    if (!Number.isInteger(selectedSlotIndex) || selectedSlotIndex < 0) {
      throw new GameRuleError("INVALID_SLOT_INDEX");
    }

    if (selectedSlotIndex > playerTimeline.length) {
      throw new GameRuleError("INVALID_SLOT_INDEX");
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
        challengeDeadlineEpochMs: placeCardOptions.challengeDeadlineEpochMs ?? null,
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
        placementResult.isCorrect && nextTimeline.length >= gameState.targetTimelineCardCount
          ? playerId
          : null,
    };
  }

  public confirmReveal(gameState: GameState): GameState {
    if (gameState.phase !== "reveal" || !gameState.turn || !gameState.revealState) {
      throw new GameRuleError("GAME_NOT_IN_REVEAL_PHASE");
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

    return beginTurnOfNextPlayer(gameState, this.shuffleCards);
  }

  public advanceTurnToPlayer(gameState: GameState, nextActivePlayerId: string): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_TURN_PHASE");
    }

    if (!gameState.players.some((player) => player.id === nextActivePlayerId)) {
      throw new GameRuleError("PLAYER_NOT_FOUND");
    }

    if (gameState.turn.activePlayerId === nextActivePlayerId) {
      throw new GameRuleError("ACTIVE_PLAYER_UNCHANGED");
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

  public skipOfflinePlayerTurn(gameState: GameState): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_TURN_PHASE");
    }

    return beginTurnOfNextPlayer(gameState, this.shuffleCards);
  }

  public skipTurnToPlayer(gameState: GameState, nextActivePlayerId: string): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_TURN_PHASE");
    }

    if (!gameState.players.some((player) => player.id === nextActivePlayerId)) {
      throw new GameRuleError("PLAYER_NOT_FOUND");
    }

    return beginNextTurn(gameState, nextActivePlayerId, this.shuffleCards);
  }
}
