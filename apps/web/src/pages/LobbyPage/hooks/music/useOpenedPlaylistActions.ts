import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import type { UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";

/**
 * Add, replace and remove for an album, artist or playlist opened from Find, with one short toast
 * for each. Plan `22` S8 replaces the view these serve with the Playlist view.
 */
export function useOpenedPlaylistActions(spotify: UseLobbySpotifyResult) {
  const { t } = useI18n();
  const { showToast } = useAppToast();
  const {
    applyOpenedPlaylistTracks,
    openedPlaylist,
    queuedTrackIds,
    removeOpenedPlaylistTracksFromQueue,
  } = spotify.openedPlaylist;
  const queuedSpotifyTrackIds = spotify.smartSearch.smartSearchQueuedTrackIds;

  function isQueued(trackId: string) {
    return queuedTrackIds.has(trackId) || queuedSpotifyTrackIds.has(trackId);
  }

  function addTracks(trackIds: Iterable<string>) {
    const unqueuedTrackIds = new Set([...trackIds].filter((trackId) => !isQueued(trackId)));
    if (unqueuedTrackIds.size === 0) {
      showToast({
        durationMs: 1600,
        id: "music-find-already-queued",
        message: t("lobby.spotify.builder.tracksAlreadyQueued"),
        type: "info",
      });
      return;
    }
    applyOpenedPlaylistTracks("append", unqueuedTrackIds);
    showSuccess(
      unqueuedTrackIds.size === 1
        ? t("lobby.spotify.builder.trackAdded")
        : t("lobby.spotify.builder.playlistTracksAdded", { count: unqueuedTrackIds.size }),
    );
  }

  function addAll() {
    if (openedPlaylist) addTracks(openedPlaylist.tracks.map((track) => track.id));
  }

  function removeSelected(trackIds: ReadonlySet<string>) {
    if (trackIds.size === 0) return;
    removeOpenedPlaylistTracksFromQueue(trackIds);
    showSuccess(
      trackIds.size === 1
        ? t("lobby.spotify.builder.trackRemoved")
        : t("lobby.spotify.builder.playlistTracksRemoved", { count: trackIds.size }),
    );
  }

  function replace() {
    if (!openedPlaylist || openedPlaylist.tracks.length === 0) return;
    applyOpenedPlaylistTracks("replace");
    showSuccess(
      t("lobby.spotify.builder.playlistTracksReplaced", { count: openedPlaylist.tracks.length }),
    );
  }

  function showSuccess(message: string) {
    showToast({ durationMs: 1100, id: "music-find-track", message, type: "success" });
  }

  return { addAll, addSelected: addTracks, removeSelected, replace };
}

export type OpenedPlaylistActions = ReturnType<typeof useOpenedPlaylistActions>;
