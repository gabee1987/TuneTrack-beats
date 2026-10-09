import type { TrackCardPublic, TrackMetadataStatus } from "../game/track.js";

export type PlaylistQueueUpdateMode = "append" | "replace";

/** A deck track as the host curates it in the lobby, where the year is always shown. */
export interface PublicTrackInfo extends TrackCardPublic {
  releaseYear: number;
  metadataStatus: TrackMetadataStatus;
}

export interface PlaylistTracksPayload {
  tracks: PublicTrackInfo[];
}

/** The reply to one track edit: only that track, not the whole deck (05 A10, B-16). */
export interface PlaylistTrackUpdatedPayload {
  track: PublicTrackInfo;
}
