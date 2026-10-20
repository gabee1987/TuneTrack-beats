export type TrackId = string;
export type TrackMetadataStatus = "imported" | "edited" | "verified";

/** A card as players see it; `releaseYear` is withheld until the reveal. */
export interface TrackCardPublic {
  id: TrackId;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear?: number;
  sourceReleaseYear?: number;
  metadataStatus?: TrackMetadataStatus;
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}
