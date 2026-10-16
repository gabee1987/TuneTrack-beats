import {
  applyTrackEdit,
  getTrackCurationFlags,
  type PublicTrackInfo,
  type TrackEditPatch,
} from "@tunetrack/shared/client";

/** All songs, or only those whose imported year still needs a look. */
export type PlaylistEditorFilter = "all" | "needsCheck";

/** Which deck the song editor opens on, and where: the room's own deck or one saved here. */
export type PlaylistEditorTarget =
  | { deck: "room"; filter: PlaylistEditorFilter; trackId?: string | undefined }
  | { deck: "saved"; deckId: string; filter: PlaylistEditorFilter };

/** One deck the editor can change, wherever its songs are kept. */
export interface PlaylistEditorSource {
  isLoading: boolean;
  removeTracks: (trackIds: readonly string[]) => void;
  tracks: PublicTrackInfo[];
  updateTrack: (trackId: string, patch: TrackEditPatch) => void;
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

/** A saved deck's songs, edited on this device: the change is written back at once. */
export function createSavedDeckSource(
  tracks: readonly PublicTrackInfo[],
  write: (tracks: PublicTrackInfo[]) => void,
): PlaylistEditorSource {
  return {
    isLoading: false,
    removeTracks: (trackIds) => write(tracks.filter((track) => !trackIds.includes(track.id))),
    tracks: [...tracks],
    updateTrack: (trackId, patch) =>
      write(tracks.map((track) => (track.id === trackId ? applyTrackEdit(track, patch) : track))),
  };
}
