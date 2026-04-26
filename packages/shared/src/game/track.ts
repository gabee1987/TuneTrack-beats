export type TrackId = string;

export interface TrackCardPublic {
  id: TrackId;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear?: number;
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}

export interface TrackCardInternal extends TrackCardPublic {
  releaseYear: number;
}
