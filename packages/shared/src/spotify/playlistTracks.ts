export interface PublicTrackInfo {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  artworkUrl?: string;
}

export interface PlaylistTracksPayload {
  tracks: PublicTrackInfo[];
}
