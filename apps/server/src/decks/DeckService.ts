import type { GameTrackCard } from "@tunetrack/game-engine";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const testDeckCardSchema = z.object({
  id: z.string().trim().min(1),
  releaseYear: z.number().int(),
  title: z.string().trim().min(1),
  artist: z.string().trim().min(1),
  albumTitle: z.string().trim().min(1),
  genre: z.string().trim().min(1).optional(),
  artworkUrl: z.string().trim().url().optional(),
});

const testDeckSchema = z.array(testDeckCardSchema).min(1);

type ParsedTestDeckCard = z.output<typeof testDeckCardSchema>;

export class DeckService {
  public constructor(
    private readonly testDecksDirectoryPath = resolve(
      process.cwd(),
      "src",
      "decks",
      "test-decks",
    ),
  ) {}

  public createShuffledDeck(): GameTrackCard[] {
    const deckCardsById = new Map<string, GameTrackCard>();

    for (const deckFileName of this.getDeckFileNames()) {
      const deckFilePath = resolve(this.testDecksDirectoryPath, deckFileName);
      const rawDeckContent = readFileSync(deckFilePath, "utf-8");
      const parsedDeck = testDeckSchema.parse(JSON.parse(rawDeckContent));

      for (const deckCard of parsedDeck) {
        deckCardsById.set(deckCard.id, mapParsedDeckCard(deckCard));
      }
    }

    return shuffleDeckCards([...deckCardsById.values()]);
  }

  private getDeckFileNames(): string[] {
    return readdirSync(this.testDecksDirectoryPath).filter((deckFileName) =>
      deckFileName.endsWith(".json"),
    );
  }
}

function mapParsedDeckCard(deckCard: ParsedTestDeckCard): GameTrackCard {
  return {
    id: deckCard.id,
    title: deckCard.title,
    artist: deckCard.artist,
    albumTitle: deckCard.albumTitle,
    releaseYear: deckCard.releaseYear,
    ...(deckCard.genre ? { genre: deckCard.genre } : {}),
    ...(deckCard.artworkUrl ? { artworkUrl: deckCard.artworkUrl } : {}),
  };
}

function shuffleDeckCards(deckCards: GameTrackCard[]): GameTrackCard[] {
  const shuffledDeckCards = [...deckCards];

  for (
    let currentIndex = shuffledDeckCards.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    const currentCard = shuffledDeckCards[currentIndex];
    const randomCard = shuffledDeckCards[randomIndex];

    if (!currentCard || !randomCard) {
      continue;
    }

    shuffledDeckCards[currentIndex] = randomCard;
    shuffledDeckCards[randomIndex] = currentCard;
  }

  return shuffledDeckCards;
}
