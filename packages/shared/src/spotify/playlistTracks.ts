import type { TrackMetadataStatus } from "../game/track.js";

export type PlaylistQueueUpdateMode = "append" | "replace";

export interface PublicTrackInfo {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  sourceReleaseYear?: number;
  metadataStatus: TrackMetadataStatus;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}

export interface PlaylistTracksPayload {
  tracks: PublicTrackInfo[];
}

/** The reply to one track edit: only that track, not the whole deck (05 A10, B-16). */
export interface PlaylistTrackUpdatedPayload {
  track: PublicTrackInfo;
}
