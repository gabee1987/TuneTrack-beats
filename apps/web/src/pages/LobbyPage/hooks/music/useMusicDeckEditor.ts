import type { PublicRoomSettings, PublicTrackInfo } from "@tunetrack/shared/client";
import { pickDeckCovers } from "./musicSetupSelectors";
import { needsYearCheck, type PlaylistEditorSource } from "./playlistEditorTarget";
import { useRoomDeckTracks } from "./useRoomDeckTracks";

const SONGS_TO_LIST = 3;

export interface MusicDeckEditor {
  /** The covers and first flagged songs of the room deck, for its cards. */
  roomCovers: string[];
  /** The room deck's songs, for its Playlist view and a song opened from its card. */
  roomDeck: PlaylistEditorSource;
  roomSongsToCheck: PublicTrackInfo[];
}

/**
 * The room deck's songs, asked for once per deck rather than per opening: the Music card shows
 * their covers, and Music setup opens on them at once. The practice deck has none to edit.
 */
export function useMusicDeckEditor(
  currentSettings: Pick<PublicRoomSettings, "deckSource" | "importedTrackCount">,
): MusicDeckEditor {
  const roomTracks = useRoomDeckTracks(
    currentSettings.deckSource === "spotify",
    `${currentSettings.deckSource}:${currentSettings.importedTrackCount}`,
  );

  return {
    roomCovers: pickDeckCovers(roomTracks.tracks),
    roomDeck: roomTracks,
    roomSongsToCheck: roomTracks.tracks.filter(needsYearCheck).slice(0, SONGS_TO_LIST),
  };
}
