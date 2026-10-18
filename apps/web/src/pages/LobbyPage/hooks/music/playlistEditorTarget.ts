import {
  getTrackCurationFlags,
  type PublicTrackInfo,
  type TrackMetadataStatus,
} from "@tunetrack/shared/client";

/** All songs, or only those whose imported year still needs a look. */
export type PlaylistEditorFilter = "all" | "needsCheck";

/** Which deck the song editor opens on, and where: the room's own deck or one saved here. */
export type PlaylistEditorTarget =
  | { deck: "room"; filter: PlaylistEditorFilter }
  | { deck: "saved"; deckId: string; filter: PlaylistEditorFilter };

/** What the song editor sends: only the fields it sets. */
export interface PlaylistTrackUpdatePatch {
  title?: string;
  artist?: string;
  albumTitle?: string;
  releaseYear?: number;
  metadataStatus?: TrackMetadataStatus;
}

/** One list the Playlist view can change, wherever its songs are kept. */
export interface PlaylistEditorSource {
  isLoading: boolean;
  removeTracks: (trackIds: readonly string[]) => void;
  tracks: PublicTrackInfo[];
  updateTrack: (trackId: string, patch: PlaylistTrackUpdatePatch) => void;
}

export function needsYearCheck(track: PublicTrackInfo): boolean {
  return getTrackCurationFlags(track).length > 0;
}

export function filterTracks(
  tracks: readonly PublicTrackInfo[],
  filter: PlaylistEditorFilter,
): PublicTrackInfo[] {
  return filter === "needsCheck" ? tracks.filter(needsYearCheck) : [...tracks];
}
