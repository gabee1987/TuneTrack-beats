export interface GameTrackCard {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}
