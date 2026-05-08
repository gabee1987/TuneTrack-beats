export type TrackId = string;
export type TrackMetadataStatus = "imported" | "edited" | "verified";

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

export interface TrackCardInternal extends TrackCardPublic {
  releaseYear: number;
}
