import type { GameTrackCard } from "@tunetrack/game-engine";
import { loadCuratedPlaylistPayloadSchema } from "@tunetrack/shared";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
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

  describe("practice deck (B-24)", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("reads and validates the deck files once for several games", () => {
      const deckLoaded = vi.spyOn(logger, "info");
      const deckService = new DeckService();

      const firstDeck = deckService.getPracticeDeck();
      const secondDeck = deckService.getPracticeDeck();

      expect(firstDeck.length).toBeGreaterThan(0);
      expect(secondDeck).toHaveLength(firstDeck.length);
      expect(
        deckLoaded.mock.calls.filter(([, message]) => message === "test deck loaded"),
      ).toHaveLength(1);
    });

    it("gives every room its own card objects", () => {
      const deckService = new DeckService();
      const [firstCard] = deckService.getPracticeDeck();
      const secondDeck = deckService.getPracticeDeck();

      expect(secondDeck.find((card) => card.id === firstCard?.id)).not.toBe(firstCard);
    });

    it("marks every card for a generated cover the contract accepts", () => {
      const deck = new DeckService().getPracticeDeck();

      expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
      for (const card of deck) {
        expect(card.artworkUrl).toBe(`/practice-covers/${card.id}.svg`);
      }
      expect(
        loadCuratedPlaylistPayloadSchema.safeParse({ roomId: "TEST_ROOM_1", tracks: deck }).success,
      ).toBe(true);
    });

    it("finds the deck files whatever the working directory", () => {
      vi.spyOn(process, "cwd").mockReturnValue(tmpdir());

      expect(new DeckService().getPracticeDeck().length).toBeGreaterThan(0);
    });
  });
});
