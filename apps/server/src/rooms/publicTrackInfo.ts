import type { PublicTrackInfo } from "@tunetrack/shared";

export function cardToPublicTrackInfo(card: {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  sourceReleaseYear?: number;
  metadataStatus?: "imported" | "edited" | "verified";
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}): PublicTrackInfo {
  return {
    id: card.id,
    title: card.title,
    artist: card.artist,
    albumTitle: card.albumTitle,
    releaseYear: card.releaseYear,
    sourceReleaseYear: card.sourceReleaseYear ?? card.releaseYear,
    metadataStatus: card.metadataStatus ?? "imported",
    ...(card.artworkUrl ? { artworkUrl: card.artworkUrl } : {}),
    ...(card.previewUrl ? { previewUrl: card.previewUrl } : {}),
    ...(card.spotifyTrackUri ? { spotifyTrackUri: card.spotifyTrackUri } : {}),
  };
}
