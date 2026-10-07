import type { GameTrackCard } from "@tunetrack/game-engine";
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

      const firstDeck = deckService.createShuffledDeck();
      const secondDeck = deckService.createShuffledDeck();

      expect(firstDeck.length).toBeGreaterThan(0);
      expect(secondDeck).toHaveLength(firstDeck.length);
      expect(
        deckLoaded.mock.calls.filter(([, message]) => message === "test deck loaded"),
      ).toHaveLength(1);
    });

    it("gives every game its own card objects", () => {
      const deckService = new DeckService(undefined, () => 0);
      const [firstCard] = deckService.createShuffledDeck();
      const secondDeck = deckService.createShuffledDeck();

      expect(secondDeck.find((card) => card.id === firstCard?.id)).not.toBe(firstCard);
    });

    it("finds the deck files whatever the working directory", () => {
      vi.spyOn(process, "cwd").mockReturnValue(tmpdir());

      expect(new DeckService().createShuffledDeck().length).toBeGreaterThan(0);
    });
  });
});
