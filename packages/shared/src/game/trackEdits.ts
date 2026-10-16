import type { TrackMetadataStatus } from "./track.js";

export interface TrackEditPatch {
  title?: string | undefined;
  artist?: string | undefined;
  albumTitle?: string | undefined;
  releaseYear?: number | undefined;
  metadataStatus?: TrackMetadataStatus | undefined;
}

interface EditableTrack {
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear?: number;
  sourceReleaseYear?: number;
  metadataStatus?: TrackMetadataStatus;
}

/**
 * One host edit to a song: any metadata change marks it `edited` unless the host set the
 * status. The room deck (server) and saved decks (this device) apply the same rule.
 */
export function applyTrackEdit<T extends EditableTrack>(track: T, patch: TrackEditPatch): T {
  const didChangeMetadata =
    patch.title !== undefined ||
    patch.artist !== undefined ||
    patch.albumTitle !== undefined ||
    patch.releaseYear !== undefined;

  return {
    ...track,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.artist !== undefined ? { artist: patch.artist } : {}),
    ...(patch.albumTitle !== undefined ? { albumTitle: patch.albumTitle } : {}),
    releaseYear: patch.releaseYear ?? track.releaseYear,
    sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
    metadataStatus:
      patch.metadataStatus ?? (didChangeMetadata ? "edited" : (track.metadataStatus ?? "imported")),
  };
}
