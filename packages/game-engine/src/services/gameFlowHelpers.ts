import type { GamePlayer } from "../domain/GamePlayer.js";
import type { GameTrackCard } from "../domain/GameTrackCard.js";
import type { TimelineCard } from "../domain/TimelineCard.js";
import { evaluateTimelinePlacement } from "../rules/placementRules.js";
import type { StartGameInput } from "./gameFlowTypes.js";

export const MAX_TT_TOKEN_COUNT = 5;

export function findFirstValidSlotIndex(
  timelineCards: TimelineCard[],
  releaseYear: number,
): number {
  for (let selectedSlotIndex = 0; selectedSlotIndex <= timelineCards.length; selectedSlotIndex += 1) {
    const placementResult = evaluateTimelinePlacement(
      timelineCards,
      releaseYear,
      selectedSlotIndex,
    );

    if (placementResult.isCorrect) {
      return selectedSlotIndex;
    }
  }

  throw new Error("VALID_SLOT_NOT_FOUND");
}

export function validateStartGameInput(startGameInput: StartGameInput): void {
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

export function drawStartingTimelineCards(
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

export function drawNextCard(deck: GameTrackCard[]): GameTrackCard | null {
  return deck.shift() ?? null;
}

export function insertTimelineCard(
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

export function findNextActivePlayerId(
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

export function updatePlayerTokenCount(
  players: GamePlayer[],
  playerId: string,
  tokenDelta: number,
): GamePlayer[] {
  let hasMatchingPlayer = false;

  const nextPlayers = players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    hasMatchingPlayer = true;

    return {
      ...player,
      ttTokenCount: Math.min(MAX_TT_TOKEN_COUNT, Math.max(0, player.ttTokenCount + tokenDelta)),
    };
  });

  if (!hasMatchingPlayer) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  return nextPlayers;
}

export function assertPlayerHasEnoughTt(
  players: GamePlayer[],
  playerId: string,
  requiredTokenCount: number,
): void {
  const player = players.find((candidatePlayer) => candidatePlayer.id === playerId);

  if (!player) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  if (player.ttTokenCount < requiredTokenCount) {
    throw new Error("INSUFFICIENT_TT");
  }
}
