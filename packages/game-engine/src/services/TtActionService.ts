import type { GameState } from "../domain/GameState.js";
import type { RevealState } from "../domain/RevealState.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import {
  assertPlayerHasEnoughTt,
  drawNextCard,
  findFirstValidSlotIndex,
  insertTimelineCard,
  updatePlayerTokenCount,
} from "./gameFlowHelpers.js";

export class TtActionService {
  public awardTtTokens(
    gameState: GameState,
    playerId: string,
    tokenAmount: number,
  ): GameState {
    if (!Number.isInteger(tokenAmount) || tokenAmount === 0) {
      throw new Error("INVALID_TT_AMOUNT");
    }

    return {
      ...gameState,
      players: updatePlayerTokenCount(gameState.players, playerId, tokenAmount),
    };
  }

  public skipCurrentTrackWithTt(
    gameState: GameState,
    playerId: string,
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

    assertPlayerHasEnoughTt(gameState.players, playerId, 1);

    if (gameState.turn.hasUsedSkipTrackWithTt) {
      throw new Error("SKIP_ALREADY_USED_THIS_TURN");
    }

    const nextTrackCard = drawNextCard(gameState.deck);

    if (!nextTrackCard) {
      throw new Error("NOT_ENOUGH_CARDS");
    }

    return {
      ...gameState,
      players: updatePlayerTokenCount(gameState.players, playerId, -1),
      currentTrackCard: nextTrackCard,
      turn: {
        ...gameState.turn,
        hasUsedSkipTrackWithTt: true,
      },
      challengeState: null,
      revealState: null,
    };
  }

  public buyTimelineCardWithTt(
    gameState: GameState,
    playerId: string,
  ): GameState {
    if (gameState.phase !== "turn" || !gameState.turn) {
      throw new Error("GAME_NOT_IN_TURN_PHASE");
    }

    if (gameState.turn.activePlayerId !== playerId) {
      throw new Error("NOT_ACTIVE_PLAYER");
    }

    const playerTimeline = gameState.timelines[playerId];

    if (!playerTimeline) {
      throw new Error("PLAYER_TIMELINE_NOT_FOUND");
    }

    assertPlayerHasEnoughTt(gameState.players, playerId, 3);

    const boughtTrackCard = gameState.currentTrackCard;

    if (!boughtTrackCard) {
      throw new Error("CURRENT_CARD_NOT_AVAILABLE");
    }

    const awardedSlotIndex = findFirstValidSlotIndex(
      playerTimeline,
      boughtTrackCard.releaseYear,
    );
    const boughtTimelineCard: TimelineCard = {
      id: boughtTrackCard.id,
      releaseYear: boughtTrackCard.releaseYear,
    };
    const nextTimeline = insertTimelineCard(
      playerTimeline,
      awardedSlotIndex,
      boughtTimelineCard,
    );
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
      players: updatePlayerTokenCount(gameState.players, playerId, -3),
      timelines: {
        ...gameState.timelines,
        [playerId]: nextTimeline,
      },
      currentTrackCard: gameState.currentTrackCard,
      turn: gameState.turn,
      challengeState: null,
      revealState,
      history: [...gameState.history, revealState],
      winnerPlayerId:
        nextTimeline.length >= gameState.targetTimelineCardCount
          ? playerId
          : null,
    };
  }
}
