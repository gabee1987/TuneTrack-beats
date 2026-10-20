import { SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT } from "../spotify/spotifyDiscovery.js";

export const MIN_RECOMMENDED_DECK_SIZE = 40;
export const MAX_RECOMMENDED_DECK_SIZE = SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT;

interface DeckSizeInput {
  startingTimelineCardCounts: readonly number[];
  targetTimelineCardCount: number;
}

/**
 * Discarded cards are reshuffled (decision 6), so only cards held on timelines leave play: the
 * game can always finish when every player can hold `target − 1` cards and one more card exists.
 */
export function getRequiredDeckSize({
  startingTimelineCardCounts,
  targetTimelineCardCount,
}: DeckSizeInput): number {
  const heldCardCount = startingTimelineCardCounts.reduce(
    (total, startingCount) => total + Math.max(startingCount, targetTimelineCardCount - 1),
    0,
  );
  return heldCardCount + 1;
}

export function getRecommendedDeckSize(input: DeckSizeInput): number {
  const roomyDeckSize = Math.ceil((getRequiredDeckSize(input) * 1.5) / 10) * 10;
  return Math.min(Math.max(roomyDeckSize, MIN_RECOMMENDED_DECK_SIZE), MAX_RECOMMENDED_DECK_SIZE);
}
