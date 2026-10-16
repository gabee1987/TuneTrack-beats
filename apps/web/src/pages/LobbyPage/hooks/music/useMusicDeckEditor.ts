import type { PublicRoomSettings, PublicTrackInfo } from "@tunetrack/shared/client";
import { pickDeckCovers } from "./musicSetupSelectors";
import { needsYearCheck, type PlaylistEditorSource } from "./playlistEditorTarget";
import { useRoomDeckTracks } from "./useRoomDeckTracks";

const SONGS_TO_LIST = 3;

export interface MusicDeckEditor {
  /** The covers and first flagged songs of the room deck, for its card. */
  roomCovers: string[];
  /** The room deck's songs, for its Playlist view and a song opened from its card. */
  roomDeck: PlaylistEditorSource;
  roomSongsToCheck: PublicTrackInfo[];
}

/** The room deck's songs while the Music sheet is open; the practice deck has none to edit. */
export function useMusicDeckEditor(
  currentSettings: Pick<PublicRoomSettings, "deckSource" | "importedTrackCount">,
  isSheetOpen: boolean,
): MusicDeckEditor {
  const roomTracks = useRoomDeckTracks(
    isSheetOpen && currentSettings.deckSource === "spotify",
    `${currentSettings.deckSource}:${currentSettings.importedTrackCount}`,
  );

  return {
    roomCovers: pickDeckCovers(roomTracks.tracks),
    roomDeck: roomTracks,
    roomSongsToCheck: roomTracks.tracks.filter(needsYearCheck).slice(0, SONGS_TO_LIST),
  };
}
