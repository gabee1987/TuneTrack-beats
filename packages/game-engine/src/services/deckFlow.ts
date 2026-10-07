import type { GameState } from "../domain/GameState.js";
import type { GameTrackCard } from "../domain/GameTrackCard.js";
import { findNextActivePlayerId } from "./gameFlowHelpers.js";

/** Must return a new array; the input belongs to the previous game state. */
export type ShuffleCards = (cards: GameTrackCard[]) => GameTrackCard[];

export interface CardPiles {
  deck: GameTrackCard[];
  discardPile: GameTrackCard[];
}

export function shuffleCardsRandomly(cards: GameTrackCard[]): GameTrackCard[] {
  const shuffledCards = [...cards];
  for (let currentIndex = shuffledCards.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    const currentCard = shuffledCards[currentIndex]!;
    shuffledCards[currentIndex] = shuffledCards[randomIndex]!;
    shuffledCards[randomIndex] = currentCard;
  }
  return shuffledCards;
}

export function drawNextCard(
  piles: CardPiles,
  shuffleCards: ShuffleCards,
): CardPiles & { card: GameTrackCard | null } {
  const source =
    piles.deck.length > 0 ? piles : { deck: shuffleCards(piles.discardPile), discardPile: [] };
  const [card = null, ...deck] = source.deck;
  return { card, deck, discardPile: source.discardPile };
}

export function discardCurrentCardUnlessAwarded(gameState: GameState): GameTrackCard[] {
  const isCurrentCardAwarded = gameState.revealState?.awardedPlayerId != null;
  return gameState.currentTrackCard && !isCurrentCardAwarded
    ? [...gameState.discardPile, gameState.currentTrackCard]
    : gameState.discardPile;
}

export function beginNextTurn(
  gameState: GameState,
  nextActivePlayerId: string,
  shuffleCards: ShuffleCards,
): GameState {
  const draw = drawNextCard(
    { deck: gameState.deck, discardPile: discardCurrentCardUnlessAwarded(gameState) },
    shuffleCards,
  );
  const settledState: GameState = {
    ...gameState,
    deck: draw.deck,
    discardPile: draw.discardPile,
    challengeState: null,
    revealState: null,
  };

  if (!draw.card) {
    return finishWithExhaustedDeck(settledState);
  }

  return {
    ...settledState,
    phase: "turn",
    currentTrackCard: draw.card,
    turn: {
      activePlayerId: nextActivePlayerId,
      turnNumber: (gameState.turn?.turnNumber ?? 0) + 1,
      hasUsedSkipTrackWithTt: false,
    },
    winnerPlayerId: null,
  };
}

export function beginTurnOfNextPlayer(gameState: GameState, shuffleCards: ShuffleCards): GameState {
  return beginNextTurn(
    gameState,
    findNextActivePlayerId(gameState.players, gameState.turn?.activePlayerId ?? ""),
    shuffleCards,
  );
}

function finishWithExhaustedDeck(gameState: GameState): GameState {
  return {
    ...gameState,
    phase: "finished",
    currentTrackCard: null,
    turn: null,
    winnerPlayerId: selectMostTimelineCardsWinnerId(gameState),
  };
}

/** Most timeline cards wins; a tie goes to whoever reached that count first (decision 14). */
function selectMostTimelineCardsWinnerId(gameState: GameState): string | null {
  const countTimelineCards = (playerId: string) => gameState.timelines[playerId]?.length ?? 0;
  const topCount = Math.max(...gameState.players.map((player) => countTimelineCards(player.id)));
  const leaders = gameState.players
    .filter((player) => countTimelineCards(player.id) === topCount)
    .map((player) => ({
      playerId: player.id,
      reachedAtRevealIndex: findRevealIndexReachingCount(gameState, player.id, topCount),
    }));
  leaders.sort((left, right) => left.reachedAtRevealIndex - right.reachedAtRevealIndex);
  return leaders[0]?.playerId ?? null;
}

/** Timelines only ever grow through awarded reveals, so the history replays each player's count. */
function findRevealIndexReachingCount(
  gameState: GameState,
  playerId: string,
  targetCount: number,
): number {
  const awardedRevealIndexes = gameState.history.flatMap((revealState, revealIndex) =>
    revealState.awardedPlayerId === playerId ? [revealIndex] : [],
  );
  const startingCount = (gameState.timelines[playerId]?.length ?? 0) - awardedRevealIndexes.length;
  return awardedRevealIndexes[targetCount - startingCount - 1] ?? -1;
}
