import type { TrackMetadataStatus } from "../game/track.js";

export interface PublicTrackInfo {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  sourceReleaseYear?: number;
  metadataStatus: TrackMetadataStatus;
  artworkUrl?: string;
}

export interface PlaylistTracksPayload {
  tracks: PublicTrackInfo[];
}
