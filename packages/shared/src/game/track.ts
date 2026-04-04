export type TrackId = string;

export interface TrackCardPublic {
  id: TrackId;
  title: string;
  artist: string;
  artworkUrl?: string;
}

export interface TrackCardInternal extends TrackCardPublic {
  releaseYear: number;
}
