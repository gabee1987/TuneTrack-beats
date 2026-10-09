import { BUY_TIMELINE_CARD_TT_COST, SKIP_TRACK_TT_COST } from "@tunetrack/shared/constants";
import { GameRuleError } from "../domain/GameRuleError.js";
import type { GameState } from "../domain/GameState.js";
import type { RevealState } from "../domain/RevealState.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import { drawNextCard, type ShuffleCards } from "./deckFlow.js";
import {
  assertPlayerHasEnoughTt,
  findFirstValidSlotIndex,
  insertTimelineCard,
  updatePlayerTokenCount,
} from "./gameFlowHelpers.js";

export class TtActionService {
  public constructor(private readonly shuffleCards: ShuffleCards) {}

  public awardTtTokens(gameState: GameState, playerId: string, tokenAmount: number): GameState {
    if (!Number.isInteger(tokenAmount) || tokenAmount === 0) {
      throw new GameRuleError("INVALID_TT_AMOUNT");
    }

    return {
      ...gameState,
      players: updatePlayerTokenCount(gameState.players, playerId, tokenAmount),
    };
  }

  public skipCurrentTrackWithTt(gameState: GameState, playerId: string): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new GameRuleError("NOT_ACTIVE_PLAYER");
    }

    if (!gameState.currentTrackCard) {
      throw new GameRuleError("CURRENT_CARD_NOT_AVAILABLE");
    }

    assertPlayerHasEnoughTt(gameState.players, playerId, SKIP_TRACK_TT_COST);

    if (gameState.turn.hasUsedSkipTrackWithTt) {
      throw new GameRuleError("SKIP_ALREADY_USED_THIS_TURN");
    }

    // Drawing before discarding keeps a paid skip from handing back the skipped card.
    const draw = drawNextCard(gameState, this.shuffleCards);

    if (!draw.card) {
      throw new GameRuleError("NOT_ENOUGH_CARDS");
    }

    return {
      ...gameState,
      players: updatePlayerTokenCount(gameState.players, playerId, -SKIP_TRACK_TT_COST),
      deck: draw.deck,
      discardPile: [...draw.discardPile, gameState.currentTrackCard],
      currentTrackCard: draw.card,
      turn: {
        ...gameState.turn,
        hasUsedSkipTrackWithTt: true,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public buyTimelineCardWithTt(gameState: GameState, playerId: string): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new GameRuleError("NOT_ACTIVE_PLAYER");
    }

    const playerTimeline = gameState.timelines[playerId];

    if (!playerTimeline) {
      throw new GameRuleError("PLAYER_TIMELINE_NOT_FOUND");
    }

    assertPlayerHasEnoughTt(gameState.players, playerId, BUY_TIMELINE_CARD_TT_COST);

    const boughtTrackCard = gameState.currentTrackCard;

    if (!boughtTrackCard) {
      throw new GameRuleError("CURRENT_CARD_NOT_AVAILABLE");
    }

    const awardedSlotIndex = findFirstValidSlotIndex(playerTimeline, boughtTrackCard.releaseYear);
    const boughtTimelineCard: TimelineCard = {
      id: boughtTrackCard.id,
      releaseYear: boughtTrackCard.releaseYear,
    };
    const nextTimeline = insertTimelineCard(playerTimeline, awardedSlotIndex, boughtTimelineCard);
    const revealState: RevealState = {
      playerId,
      placedCard: boughtTimelineCard,
      selectedSlotIndex: awardedSlotIndex,
      wasCorrect: true,
      revealType: "tt_buy",
      validSlotIndexes: [awardedSlotIndex],
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: playerId,
      awardedSlotIndex,
    };

    return {
      ...gameState,
      phase: "reveal",
      players: updatePlayerTokenCount(gameState.players, playerId, -BUY_TIMELINE_CARD_TT_COST),
      timelines: {
        ...gameState.timelines,
        [playerId]: nextTimeline,
      },
      currentTrackCard: gameState.currentTrackCard,
      turn: gameState.turn,
      challengeState: null,
      revealState,
      history: [...gameState.history, revealState],
      winnerPlayerId: nextTimeline.length >= gameState.targetTimelineCardCount ? playerId : null,
    };
  }
}
