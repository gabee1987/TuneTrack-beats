import { describe, expect, it } from "vitest";
import {
  GameFlowService,
  type GameState,
  type GameTrackCard,
  type StartGamePlayerInput,
} from "../src/index.js";

function buildTrack(id: string, releaseYear: number): GameTrackCard {
  return { id, title: `Song ${id}`, artist: "Test Artist", albumTitle: "Test Album", releaseYear };
}

function buildPlayer(id: string, startingTimelineCardCount: number): StartGamePlayerInput {
  return { id, displayName: id, startingTimelineCardCount, startingTtTokenCount: 1 };
}

const reverseCards = (cards: GameTrackCard[]) => [...cards].reverse();
const cardIds = (cards: GameTrackCard[]) => cards.map((card) => card.id);

describe("deck exhaustion", () => {
  const gameFlowService = new GameFlowService(reverseCards);

  // Starting cards: player-1 1990, player-2 2005. The first turn card is 2000, the last 1975.
  function startTwoPlayerGame(): GameState {
    return gameFlowService.startGame({
      players: [buildPlayer("player-1", 1), buildPlayer("player-2", 1)],
      deck: [
        buildTrack("track-1", 1990),
        buildTrack("track-2", 2005),
        buildTrack("track-3", 2000),
        buildTrack("track-4", 1975),
      ],
      targetTimelineCardCount: 10,
    });
  }

  function placeAndConfirm(gameState: GameState, playerId: string, slotIndex: number): GameState {
    return gameFlowService.confirmReveal(gameFlowService.placeCard(gameState, playerId, slotIndex));
  }

  it("shuffles the discarded cards into a new deck after the last card", () => {
    const afterFirstMiss = placeAndConfirm(startTwoPlayerGame(), "player-1", 0);
    expect(afterFirstMiss.deck).toEqual([]);
    expect(cardIds(afterFirstMiss.discardPile)).toEqual(["track-3"]);

    const afterSecondMiss = placeAndConfirm(afterFirstMiss, "player-2", 1);

    expect(afterSecondMiss.phase).toBe("turn");
    expect(afterSecondMiss.currentTrackCard?.id).toBe("track-4");
    expect(cardIds(afterSecondMiss.deck)).toEqual(["track-3"]);
    expect(afterSecondMiss.discardPile).toEqual([]);
  });

  it("never returns a card that reached a timeline", () => {
    const afterHit = placeAndConfirm(startTwoPlayerGame(), "player-1", 1);
    const afterMiss = placeAndConfirm(afterHit, "player-2", 1);

    expect(afterMiss.currentTrackCard?.id).toBe("track-4");
    expect(cardIds([...afterMiss.deck, ...afterMiss.discardPile])).not.toContain("track-3");
  });

  it("discards the card of a skipped turn", () => {
    const skippedState = gameFlowService.skipTurnToPlayer(startTwoPlayerGame(), "player-2");

    expect(cardIds(skippedState.discardPile)).toEqual(["track-3"]);
  });

  it("lets a TT skip draw from the discard pile without handing back the skipped card", () => {
    const afterMiss = placeAndConfirm(startTwoPlayerGame(), "player-1", 0);

    const skippedState = gameFlowService.skipCurrentTrackWithTt(afterMiss, "player-2");

    expect(skippedState.currentTrackCard?.id).toBe("track-3");
    expect(skippedState.deck).toEqual([]);
    expect(cardIds(skippedState.discardPile)).toEqual(["track-4"]);
  });

  it("refuses a TT skip when the deck and the discard pile are both empty", () => {
    const afterHit = placeAndConfirm(startTwoPlayerGame(), "player-1", 1);

    expect(() => gameFlowService.skipCurrentTrackWithTt(afterHit, "player-2")).toThrow(
      "NOT_ENOUGH_CARDS",
    );
  });

  it("finishes when the deck and the discard pile are both empty and crowns the most cards", () => {
    const afterHit = placeAndConfirm(startTwoPlayerGame(), "player-1", 1);
    const afterMiss = placeAndConfirm(afterHit, "player-2", 1);

    const finishedState = placeAndConfirm(afterMiss, "player-1", 0);

    expect(finishedState).toMatchObject({
      phase: "finished",
      currentTrackCard: null,
      turn: null,
      winnerPlayerId: "player-1",
    });
  });

  it("breaks a tie in favour of whoever reached the top count first", () => {
    // player-2 starts with two cards; player-1 only reaches two with the last card.
    const gameState = gameFlowService.startGame({
      players: [buildPlayer("player-1", 1), buildPlayer("player-2", 2)],
      deck: [
        buildTrack("track-1", 1990),
        buildTrack("track-2", 2005),
        buildTrack("track-3", 1985),
        buildTrack("track-4", 2000),
      ],
      targetTimelineCardCount: 10,
    });

    const finishedState = placeAndConfirm(gameState, "player-1", 1);

    expect(finishedState.timelines["player-1"]).toHaveLength(2);
    expect(finishedState.timelines["player-2"]).toHaveLength(2);
    expect(finishedState.winnerPlayerId).toBe("player-2");
  });

  it("never crowns a removed player when the removal empties the game", () => {
    const gameState = gameFlowService.startGame({
      players: [buildPlayer("player-1", 2), buildPlayer("player-2", 1), buildPlayer("player-3", 1)],
      deck: [
        buildTrack("track-1", 1990),
        buildTrack("track-2", 2010),
        buildTrack("track-3", 2005),
        buildTrack("track-4", 1985),
        buildTrack("track-5", 2000),
      ],
      targetTimelineCardCount: 10,
    });
    const revealState = gameFlowService.placeCard(gameState, "player-1", 1);

    const finishedState = gameFlowService.removePlayer(revealState, "player-1");

    expect(finishedState.phase).toBe("finished");
    expect(finishedState.winnerPlayerId).toBe("player-2");
  });
});
