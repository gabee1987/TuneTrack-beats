import { applyTrackEdit, type PublicTrackInfo } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import type { SavedPlaylist } from "../../../../services/savedPlaylists/savedPlaylists";
import type { LobbySpotifySavedPlaylistsState } from "../spotify/lobbySpotify.types";
import type { PlaylistEditorSource, PlaylistTrackUpdatePatch } from "./playlistEditorTarget";

const WRITE_BACK_TOAST_ID = "saved-deck-write-back";

/**
 * A saved deck's songs, edited on this device: every change is written back at once and the
 * toast offers Undo (decision 24). When the game's deck was loaded from this saved deck, a song
 * edit reaches it too, and so does its Undo.
 */
export function useSavedDeckWriteBack(
  savedPlaylists: Pick<
    LobbySpotifySavedPlaylistsState,
    "loadedSavedPlaylistId" | "updateSavedDeckTracks"
  >,
  roomDeck: PlaylistEditorSource,
): (deck: SavedPlaylist | undefined) => PlaylistEditorSource {
  const { t } = useI18n();
  const { showToast } = useAppToast();
  const { loadedSavedPlaylistId, updateSavedDeckTracks } = savedPlaylists;

  return (deck) => {
    const tracks: PublicTrackInfo[] = deck?.tracks ?? [];

    function writeBack(next: PublicTrackInfo[], undoInGame?: () => void) {
      if (!deck) return;
      updateSavedDeckTracks(deck.id, next);
      showToast({
        action: {
          label: t("common.undo"),
          onAction: () => {
            updateSavedDeckTracks(deck.id, tracks);
            undoInGame?.();
          },
        },
        id: WRITE_BACK_TOAST_ID,
        message: t("music.song.saved", { deck: deck.name }),
        type: "success",
      });
    }

    function updateTrack(trackId: string, patch: PlaylistTrackUpdatePatch) {
      const previous = tracks.find((track) => track.id === trackId);
      if (!previous) return;
      const next = tracks.map((track) =>
        track.id === trackId ? applyTrackEdit(track, patch) : track,
      );
      const isInGame =
        deck?.id === loadedSavedPlaylistId && roomDeck.tracks.some((track) => track.id === trackId);
      if (!isInGame) {
        writeBack(next);
        return;
      }

      roomDeck.updateTrack(trackId, patch);
      writeBack(next, () => roomDeck.updateTrack(trackId, toTrackRecord(previous)));
    }

    return {
      isLoading: false,
      removeTracks: (trackIds) => writeBack(tracks.filter((track) => !trackIds.includes(track.id))),
      tracks,
      updateTrack,
    };
  };
}

/** Every field the song editor sets, so an Undo puts the song back exactly as it was. */
function toTrackRecord(track: PublicTrackInfo): PlaylistTrackUpdatePatch {
  return {
    albumTitle: track.albumTitle,
    artist: track.artist,
    metadataStatus: track.metadataStatus,
    releaseYear: track.releaseYear,
    title: track.title,
  };
}
