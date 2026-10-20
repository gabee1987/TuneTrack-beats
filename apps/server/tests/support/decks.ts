import type { GameTrackCard } from "@tunetrack/game-engine";

/** One card per year, in deck order: the first card seeds each timeline, the next is dealt. */
export function buildYearDeck(years: readonly number[], idPrefix = "test-track"): GameTrackCard[] {
  return years.map((releaseYear, index) => ({
    id: `${idPrefix}-${index + 1}`,
    title: `Track ${index + 1}`,
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear,
  }));
}

export function fourDecadeDeck(idPrefix?: string): GameTrackCard[] {
  return buildYearDeck([1980, 1990, 2000, 2010], idPrefix);
}

/**
 * Host and guest start with 1980 and 2000; the host is dealt 1990 (slot 1 is right), then the
 * guest 2010.
 */
export function turnOrderDeck(): GameTrackCard[] {
  return [
    { title: "Older Song", genre: "Rock", releaseYear: 1980 },
    { title: "Newer Song", genre: "Soul", releaseYear: 2000 },
    { title: "Middle Song", genre: "Pop", releaseYear: 1990 },
    { title: "Newest Song", genre: "Disco", releaseYear: 2010 },
    { title: "Oldest Song", genre: "Funk", releaseYear: 1970 },
    { title: "Future Song", genre: "House", releaseYear: 2020 },
  ].map((card, index) => ({
    ...card,
    id: `test-track-${index + 1}`,
    artist: `Test Artist ${index + 1}`,
    albumTitle: `Test Album ${index + 1}`,
  }));
}
