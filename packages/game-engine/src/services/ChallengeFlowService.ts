import { GameRuleError } from "../domain/GameRuleError.js";
import type { GameState } from "../domain/GameState.js";
import type { RevealState } from "../domain/RevealState.js";
import { isChallengeWindowExpired } from "../rules/challengeRules.js";
import { evaluateTimelinePlacement } from "../rules/placementRules.js";
import { beginTurnOfNextPlayer, type ShuffleCards } from "./deckFlow.js";
import {
  findFirstValidSlotIndex,
  insertTimelineCard,
  updatePlayerTokenCount,
} from "./gameFlowHelpers.js";

export class ChallengeFlowService {
  public constructor(private readonly shuffleCards: ShuffleCards) {}

  public claimChallenge(
    gameState: GameState,
    challengerPlayerId: string,
    nowEpochMs: number,
  ): GameState {
    if (gameState.phase !== "challenge" || !gameState.challengeState || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_CHALLENGE_PHASE");
    }

    if (isChallengeWindowExpired(gameState, nowEpochMs)) {
      throw new GameRuleError("CHALLENGE_WINDOW_EXPIRED");
    }

    if (gameState.turn.activePlayerId === challengerPlayerId) {
      throw new GameRuleError("ACTIVE_PLAYER_CANNOT_CHALLENGE");
    }

    if (gameState.challengeState.challengerPlayerId) {
      throw new GameRuleError("CHALLENGE_ALREADY_CLAIMED");
    }

    const challenger = gameState.players.find((player) => player.id === challengerPlayerId);

    if (!challenger) {
      throw new GameRuleError("PLAYER_NOT_FOUND");
    }

    if (challenger.ttTokenCount < 1) {
      throw new GameRuleError("INSUFFICIENT_TT");
    }

    return {
      ...gameState,
      challengeState: {
        ...gameState.challengeState,
        phase: "claimed",
        challengerPlayerId,
      },
    };
  }

  public placeChallengeCard(
    gameState: GameState,
    challengerPlayerId: string,
    selectedSlotIndex: number,
  ): GameState {
    if (gameState.phase !== "challenge" || !gameState.challengeState || !gameState.turn) {
      throw new GameRuleError("GAME_NOT_IN_CHALLENGE_PHASE");
    }

    if (gameState.challengeState.challengerPlayerId !== challengerPlayerId) {
      throw new GameRuleError("ONLY_CHALLENGE_OWNER_CAN_PLACE");
    }

    const originalPlayerId = gameState.challengeState.originalPlayerId;
    const originalTimeline = gameState.timelines[originalPlayerId];

    if (!originalTimeline) {
      throw new GameRuleError("PLAYER_TIMELINE_NOT_FOUND");
    }

    if (!Number.isInteger(selectedSlotIndex) || selectedSlotIndex < 0) {
      throw new GameRuleError("INVALID_SLOT_INDEX");
    }

    if (selectedSlotIndex > originalTimeline.length) {
      throw new GameRuleError("INVALID_SLOT_INDEX");
    }

    if (selectedSlotIndex === gameState.challengeState.originalSelectedSlotIndex) {
      throw new GameRuleError("CHALLENGE_SLOT_MUST_DIFFER");
    }

    const challengerPlacement = evaluateTimelinePlacement(
      originalTimeline,
      gameState.challengeState.placedCard.releaseYear,
      selectedSlotIndex,
    );
    const challengeWasSuccessful =
      !gameState.challengeState.originalWasCorrect && challengerPlacement.isCorrect;
    const challengerTtChange = -1;
    const nextPlayers = updatePlayerTokenCount(
      gameState.players,
      challengerPlayerId,
      challengerTtChange,
    );
    const challengerTimeline = gameState.timelines[challengerPlayerId];

    if (!challengerTimeline) {
      throw new GameRuleError("PLAYER_TIMELINE_NOT_FOUND");
    }

    const challengerAwardSlotIndex = challengeWasSuccessful
      ? findFirstValidSlotIndex(challengerTimeline, gameState.challengeState.placedCard.releaseYear)
      : null;
    const nextOriginalTimeline = gameState.challengeState.originalWasCorrect
      ? insertTimelineCard(
          originalTimeline,
          gameState.challengeState.originalSelectedSlotIndex,
          gameState.challengeState.placedCard,
        )
      : [...originalTimeline];
    const nextChallengerTimeline =
      challengeWasSuccessful && challengerAwardSlotIndex !== null
        ? insertTimelineCard(
            challengerTimeline,
            challengerAwardSlotIndex,
            gameState.challengeState.placedCard,
          )
        : [...challengerTimeline];
    const nextTimelines = {
      ...gameState.timelines,
      [originalPlayerId]: nextOriginalTimeline,
      [challengerPlayerId]: nextChallengerTimeline,
    };
    const revealState: RevealState = {
      playerId: originalPlayerId,
      placedCard: gameState.challengeState.placedCard,
      selectedSlotIndex: gameState.challengeState.originalSelectedSlotIndex,
      wasCorrect: gameState.challengeState.originalWasCorrect,
      revealType: "placement",
      validSlotIndexes: gameState.challengeState.originalValidSlotIndexes,
      challengerPlayerId,
      challengerSelectedSlotIndex: selectedSlotIndex,
      challengeWasSuccessful,
      challengerTtChange,
      awardedPlayerId: challengeWasSuccessful
        ? challengerPlayerId
        : gameState.challengeState.originalWasCorrect
          ? originalPlayerId
          : null,
      awardedSlotIndex: challengeWasSuccessful
        ? challengerAwardSlotIndex
        : gameState.challengeState.originalWasCorrect
          ? gameState.challengeState.originalSelectedSlotIndex
          : null,
    };

    return {
      ...gameState,
      phase: "reveal",
      players: nextPlayers,
      timelines: nextTimelines,
      challengeState: null,
      revealState,
      history: [...gameState.history, revealState],
      winnerPlayerId:
        challengeWasSuccessful && nextChallengerTimeline.length >= gameState.targetTimelineCardCount
          ? challengerPlayerId
          : gameState.challengeState.originalWasCorrect &&
              nextOriginalTimeline.length >= gameState.targetTimelineCardCount
            ? originalPlayerId
            : null,
    };
  }

  public resolveChallengeWindow(gameState: GameState): GameState {
    if (gameState.phase !== "challenge" || !gameState.challengeState) {
      throw new GameRuleError("GAME_NOT_IN_CHALLENGE_PHASE");
    }

    if (gameState.challengeState.challengerPlayerId) {
      throw new GameRuleError("CHALLENGE_ALREADY_CLAIMED");
    }

    const originalPlayerId = gameState.challengeState.originalPlayerId;
    const originalTimeline = gameState.timelines[originalPlayerId];

    if (!originalTimeline) {
      throw new GameRuleError("PLAYER_TIMELINE_NOT_FOUND");
    }

    const nextTimeline = gameState.challengeState.originalWasCorrect
      ? insertTimelineCard(
          originalTimeline,
          gameState.challengeState.originalSelectedSlotIndex,
          gameState.challengeState.placedCard,
        )
      : [...originalTimeline];
    const nextTimelines = {
      ...gameState.timelines,
      [originalPlayerId]: nextTimeline,
    };
    const revealState: RevealState = {
      playerId: originalPlayerId,
      placedCard: gameState.challengeState.placedCard,
      selectedSlotIndex: gameState.challengeState.originalSelectedSlotIndex,
      wasCorrect: gameState.challengeState.originalWasCorrect,
      revealType: "placement",
      validSlotIndexes: gameState.challengeState.originalValidSlotIndexes,
      challengerPlayerId: null,
      challengerSelectedSlotIndex: null,
      challengeWasSuccessful: null,
      challengerTtChange: 0,
      awardedPlayerId: gameState.challengeState.originalWasCorrect ? originalPlayerId : null,
      awardedSlotIndex: gameState.challengeState.originalWasCorrect
        ? gameState.challengeState.originalSelectedSlotIndex
        : null,
    };

    return {
      ...gameState,
      phase: "reveal",
      timelines: nextTimelines,
      challengeState: null,
      revealState,
      history: [...gameState.history, revealState],
      winnerPlayerId:
        gameState.challengeState.originalWasCorrect &&
        nextTimeline.length >= gameState.targetTimelineCardCount
          ? originalPlayerId
          : null,
    };
  }

  public cancelClaimedChallengeForOfflineChallenger(gameState: GameState): GameState {
    if (
      gameState.phase !== "challenge" ||
      gameState.challengeState?.phase !== "claimed" ||
      !gameState.turn
    ) {
      throw new GameRuleError("GAME_NOT_IN_CLAIMED_CHALLENGE_PHASE");
    }

    return beginTurnOfNextPlayer(gameState, this.shuffleCards);
  }
}
