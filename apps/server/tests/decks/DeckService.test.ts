import type { GameTrackCard } from "@tunetrack/game-engine";
import { describe, expect, it } from "vitest";
import { DeckService } from "../../src/decks/DeckService.js";

function createCard(id: string, releaseYear: number): GameTrackCard {
  return {
    albumTitle: `Album ${id}`,
    artist: `Artist ${id}`,
    id,
    releaseYear,
    title: `Track ${id}`,
  };
}

describe("DeckService", () => {
  it("uses an injected random source when shuffling cards", () => {
    const deckService = new DeckService(undefined, () => 0.25);
    const cards = [
      createCard("a", 1960),
      createCard("b", 1970),
      createCard("c", 1980),
      createCard("d", 1990),
    ];

    expect(deckService.createShuffledDeckFromCards(cards).map((card) => card.id)).toEqual([
      "d",
      "c",
      "a",
      "b",
    ]);
  });
});
