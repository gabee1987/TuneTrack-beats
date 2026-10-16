import type { PublicRoomSettings, PublicTrackInfo } from "@tunetrack/shared/client";
import { useState } from "react";
import { useI18n } from "../../../../features/i18n";
import type { UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";
import { pickDeckCovers } from "./musicSetupSelectors";
import {
  createSavedDeckSource,
  needsYearCheck,
  type PlaylistEditorSource,
  type PlaylistEditorTarget,
} from "./playlistEditorTarget";
import { useRoomDeckTracks } from "./useRoomDeckTracks";

const SONGS_TO_LIST = 3;

export interface MusicDeckEditor {
  /** The covers and first flagged songs of the room deck, for its card. */
  roomCovers: string[];
  /** The room deck's songs, for a song opened from its card. */
  roomDeck: PlaylistEditorSource;
  roomSongsToCheck: PublicTrackInfo[];
  /** What the song editor shows: kept through its exit after it closes. */
  editorView: {
    isOpen: boolean;
    source: PlaylistEditorSource;
    target: PlaylistEditorTarget | null;
    title: string;
  };
}

/**
 * The room deck's songs while the Music sheet is open, and the song editor on either the room
 * deck or a saved deck. A saved deck is edited on this device and written back at once.
 */
export function useMusicDeckEditor(
  spotify: UseLobbySpotifyResult,
  currentSettings: Pick<PublicRoomSettings, "deckSource" | "importedTrackCount">,
  isSheetOpen: boolean,
): MusicDeckEditor {
  const { t } = useI18n();
  const { editor } = spotify.queue;
  const { savedPlaylists, updateSavedDeckTracks } = spotify.savedPlaylists;
  const isRoomDeckEditable = currentSettings.deckSource === "spotify";
  const roomTracks = useRoomDeckTracks(
    isSheetOpen && isRoomDeckEditable,
    `${currentSettings.deckSource}:${currentSettings.importedTrackCount}`,
  );
  const [shownTarget, setShownTarget] = useState(editor);
  if (editor && editor !== shownTarget) setShownTarget(editor);

  const savedDeck =
    shownTarget?.deck === "saved"
      ? (savedPlaylists.find((deck) => deck.id === shownTarget.deckId) ?? null)
      : null;
  const source =
    shownTarget?.deck === "saved"
      ? createSavedDeckSource(savedDeck?.tracks ?? [], (tracks) => {
          if (savedDeck) updateSavedDeckTracks(savedDeck.id, tracks);
        })
      : roomTracks;

  return {
    editorView: {
      isOpen: editor !== null,
      source,
      target: shownTarget,
      title: savedDeck?.name ?? t("music.decks.current"),
    },
    roomCovers: pickDeckCovers(roomTracks.tracks),
    roomDeck: roomTracks,
    roomSongsToCheck: roomTracks.tracks.filter(needsYearCheck).slice(0, SONGS_TO_LIST),
  };
}
