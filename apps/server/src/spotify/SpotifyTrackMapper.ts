import type { GameTrackCard } from "@tunetrack/game-engine";
import type { SpotifyApiTrack } from "./SpotifyApiClient.js";

export function mapSpotifyTrackToGameCard(
  track: SpotifyApiTrack,
): GameTrackCard | null {
  if (!track.id || !track.name || !track.album?.release_date) {
    return null;
  }

  const primaryArtist = track.artists[0]?.name;
  if (!primaryArtist) {
    return null;
  }

  const releaseYear = extractReleaseYear(track.album.release_date);
  if (releaseYear === null) {
    return null;
  }

  const artworkUrl = selectBestArtworkUrl(track.album.images);

  return {
    id: track.id,
    title: track.name,
    artist: primaryArtist,
    albumTitle: track.album.name,
    releaseYear,
    ...(artworkUrl ? { artworkUrl } : {}),
    ...(track.preview_url ? { previewUrl: track.preview_url } : {}),
    spotifyTrackUri: track.uri,
  };
}

function extractReleaseYear(releaseDate: string): number | null {
  const yearString = releaseDate.split("-")[0];
  if (!yearString) return null;

  const year = parseInt(yearString, 10);
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    return null;
  }

  return year;
}

function selectBestArtworkUrl(
  images: Array<{ url: string; width: number; height: number }>,
): string | undefined {
  if (images.length === 0) return undefined;

  const sorted = [...images].sort((a, b) => b.width - a.width);
  return sorted[0]?.url;
}
