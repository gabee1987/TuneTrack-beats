import type { GamePlayer } from "../domain/GamePlayer.js";
import type { GameState } from "../domain/GameState.js";
import type { GameTrackCard } from "../domain/GameTrackCard.js";
import type { RevealState } from "../domain/RevealState.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import { evaluateTimelinePlacement } from "../rules/placementRules.js";

export interface StartGameInput {
  players: GamePlayer[];
  deck: GameTrackCard[];
  targetTimelineCardCount: number;
}

export class GameFlowService {
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
      players: startGameInput.players.map((player) => ({ ...player })),
      timelines,
      deck,
      currentTrackCard: drawNextCard(deck),
      turn: {
        activePlayerId: firstPlayer.id,
        turnNumber: 1,
      },
      revealState: null,
      winnerPlayerId: null,
      targetTimelineCardCount: startGameInput.targetTimelineCardCount,
    };
  }

  public placeCard(
    gameState: GameState,
    playerId: string,
    selectedSlotIndex: number,
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
      validSlotIndexes: placementResult.validSlotIndexes,
    };

    return {
      ...gameState,
      phase: "reveal",
      timelines: nextTimelines,
      revealState,
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
      },
      revealState: null,
    };
  }
}

function validateStartGameInput(startGameInput: StartGameInput): void {
  if (startGameInput.players.length < 1) {
    throw new Error("NOT_ENOUGH_PLAYERS");
  }

  const totalStartingCardCount = startGameInput.players.reduce(
    (sum, player) => sum + player.startingTimelineCardCount,
    0,
  );
  const minimumRequiredDeckSize = totalStartingCardCount + 1;

  if (startGameInput.deck.length < minimumRequiredDeckSize) {
    throw new Error("NOT_ENOUGH_CARDS");
  }

  if (
    !Number.isInteger(startGameInput.targetTimelineCardCount) ||
    startGameInput.targetTimelineCardCount < 1
  ) {
    throw new Error("INVALID_TARGET_TIMELINE_CARD_COUNT");
  }
}

function drawStartingTimelineCards(
  deck: GameTrackCard[],
  startingTimelineCardCount: number,
): TimelineCard[] {
  const timelineCards: TimelineCard[] = [];

  for (let index = 0; index < startingTimelineCardCount; index += 1) {
    const card = drawNextCard(deck);

    if (!card) {
      throw new Error("NOT_ENOUGH_CARDS");
    }

    timelineCards.push({
      id: card.id,
      releaseYear: card.releaseYear,
    });
  }

  return [...timelineCards].sort(
    (leftCard, rightCard) => leftCard.releaseYear - rightCard.releaseYear,
  );
}

function drawNextCard(deck: GameTrackCard[]): GameTrackCard | null {
  return deck.shift() ?? null;
}

function insertTimelineCard(
  timelineCards: TimelineCard[],
  selectedSlotIndex: number,
  placedCard: TimelineCard,
): TimelineCard[] {
  return [
    ...timelineCards.slice(0, selectedSlotIndex),
    placedCard,
    ...timelineCards.slice(selectedSlotIndex),
  ];
}

function findNextActivePlayerId(
  players: GamePlayer[],
  currentActivePlayerId: string,
): string {
  const currentPlayerIndex = players.findIndex(
    (player) => player.id === currentActivePlayerId,
  );

  if (currentPlayerIndex === -1) {
    throw new Error("ACTIVE_PLAYER_NOT_FOUND");
  }

  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  if (!nextPlayer) {
    throw new Error("ACTIVE_PLAYER_NOT_FOUND");
  }

  return nextPlayer.id;
}
