import type { GameTrackCard } from "@tunetrack/game-engine";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { logger } from "../app/logger.js";

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
type RandomSource = () => number;

// Beside this module in src/ and in dist/ (the build copies the folder), whatever the cwd (B-24).
const DEFAULT_TEST_DECKS_DIRECTORY = fileURLToPath(new URL("./test-decks", import.meta.url));

export class DeckService {
  public constructor(
    private readonly testDecksDirectoryPath = DEFAULT_TEST_DECKS_DIRECTORY,
    private readonly randomSource: RandomSource = Math.random,
  ) {}

  private testDeckCards: GameTrackCard[] | null = null;

  public createShuffledDeckFromCards(cards: GameTrackCard[]): GameTrackCard[] {
    return shuffleDeckCards([...cards], this.randomSource);
  }

  public createShuffledDeck(): GameTrackCard[] {
    this.testDeckCards ??= this.loadTestDeckCards();
    return shuffleDeckCards(
      this.testDeckCards.map((card) => ({ ...card })),
      this.randomSource,
    );
  }

  /** Read and validated once per process; every game shuffles its own copy. */
  private loadTestDeckCards(): GameTrackCard[] {
    const deckCardsById = new Map<string, GameTrackCard>();
    const fileNames = this.getDeckFileNames();

    for (const deckFileName of fileNames) {
      const deckFilePath = resolve(this.testDecksDirectoryPath, deckFileName);
      const rawDeckContent = readFileSync(deckFilePath, "utf-8");
      const parsedDeck = testDeckSchema.parse(JSON.parse(rawDeckContent));

      for (const deckCard of parsedDeck) {
        deckCardsById.set(deckCard.id, mapParsedDeckCard(deckCard));
      }
    }

    const cards = [...deckCardsById.values()];
    logger.info({ fileCount: fileNames.length, cardCount: cards.length }, "test deck loaded");
    return cards;
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

function shuffleDeckCards(deckCards: GameTrackCard[], randomSource: RandomSource): GameTrackCard[] {
  const shuffledDeckCards = [...deckCards];

  for (let currentIndex = shuffledDeckCards.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(randomSource() * (currentIndex + 1));
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
