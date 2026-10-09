import type { GameTrackCard } from "@tunetrack/game-engine";
import type { PublicTrackInfo } from "@tunetrack/shared";

export interface TrackYearRange {
  startYear: number;
  endYear: number;
}

export interface EditedCandidateTrack {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  metadataStatus: PublicTrackInfo["metadataStatus"];
  sourceReleaseYear?: number | undefined;
  artworkUrl?: string | undefined;
  previewUrl?: string | undefined;
  spotifyTrackUri?: string | undefined;
}

export function filterCardsByYearRanges(
  cards: GameTrackCard[],
  yearRanges?: readonly TrackYearRange[],
): GameTrackCard[] {
  if (!yearRanges || yearRanges.length === 0) return cards;

  return cards.filter((card) =>
    yearRanges.some(
      (range) => card.releaseYear >= range.startYear && card.releaseYear <= range.endYear,
    ),
  );
}

export function selectBalancedByYear(cards: GameTrackCard[], targetCount: number): GameTrackCard[] {
  const cardsByYear = new Map<number, GameTrackCard[]>();
  for (const card of cards) {
    const yearCards = cardsByYear.get(card.releaseYear);
    if (yearCards) {
      yearCards.push(card);
    } else {
      cardsByYear.set(card.releaseYear, [card]);
    }
  }

  const years = [...cardsByYear.keys()].sort((left, right) => left - right);
  const selectedCards: GameTrackCard[] = [];
  let didSelectFromAnyYear = true;

  while (selectedCards.length < targetCount && didSelectFromAnyYear) {
    didSelectFromAnyYear = false;

    for (const year of years) {
      const yearCards = cardsByYear.get(year);
      const nextCard = yearCards?.shift();
      if (!nextCard) continue;

      selectedCards.push(nextCard);
      didSelectFromAnyYear = true;
      if (selectedCards.length >= targetCount) break;
    }
  }

  return selectedCards;
}

export function interleaveCardGroups(cardGroups: GameTrackCard[][]): GameTrackCard[] {
  const queues = cardGroups.map((group) => [...group]).filter((group) => group.length > 0);
  const interleavedCards: GameTrackCard[] = [];
  let didSelectFromAnyGroup = true;

  while (didSelectFromAnyGroup) {
    didSelectFromAnyGroup = false;

    for (const queue of queues) {
      const nextCard = queue.shift();
      if (!nextCard) continue;

      interleavedCards.push(nextCard);
      didSelectFromAnyGroup = true;
    }
  }

  return interleavedCards;
}

export function applyCandidateTrackEdits(
  card: GameTrackCard,
  editedTrack?: EditedCandidateTrack,
): GameTrackCard {
  if (!editedTrack) return card;

  return {
    ...card,
    title: editedTrack.title,
    artist: editedTrack.artist,
    albumTitle: editedTrack.albumTitle,
    releaseYear: editedTrack.releaseYear,
    sourceReleaseYear: editedTrack.sourceReleaseYear ?? card.sourceReleaseYear ?? card.releaseYear,
    metadataStatus: editedTrack.metadataStatus,
    ...(editedTrack.artworkUrl ? { artworkUrl: editedTrack.artworkUrl } : {}),
    ...(editedTrack.previewUrl ? { previewUrl: editedTrack.previewUrl } : {}),
    ...(editedTrack.spotifyTrackUri ? { spotifyTrackUri: editedTrack.spotifyTrackUri } : {}),
  };
}
