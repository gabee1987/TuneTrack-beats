export interface GameTrackCard {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  sourceReleaseYear?: number;
  metadataStatus?: "imported" | "edited" | "verified";
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}
