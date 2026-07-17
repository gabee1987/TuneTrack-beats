import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlaylistQueueUpdateMode,
  type PlaylistTracksPayload,
  type SpotifyPlaylistDetailPayload,
  type SpotifySmartSearchResult,
} from "@tunetrack/shared";
import { useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import { useI18n } from "../../../../features/i18n";
import { getSocketClient } from "../../../../services/socket/socketClient";
import {
  getQueuedTrackIdsFromPlaylistTracks,
  getQueuedSpotifyTrackIdsFromPlaylistTracks,
} from "./spotifyQueueTrackIds";
import type {
  CandidateTrackUpdatePatch,
  OpenedPlaylistPhase,
  OpenedSpotifyPlaylist,
} from "./lobbySpotify.types";

interface UseSpotifyOpenedPlaylistParams {
  currentPlaylistNameRef: MutableRefObject<string | undefined>;
  roomId: string | undefined;
  setQueuedTrackIds: (trackIds: Set<string>) => void;
  setSavedPlaylistMessage: (message: string | null) => void;
  setSmartSearchQueuedTrackIds: (trackIds: Set<string>) => void;
}

export function useSpotifyOpenedPlaylist({
  currentPlaylistNameRef,
  roomId,
  setQueuedTrackIds,
  setSavedPlaylistMessage,
  setSmartSearchQueuedTrackIds,
}: UseSpotifyOpenedPlaylistParams) {
  const { t } = useI18n();
  const [openedPlaylistPhase, setOpenedPlaylistPhase] = useState<OpenedPlaylistPhase>("idle");
  const [openedPlaylistError, setOpenedPlaylistError] = useState<string | null>(null);
  const [openedPlaylist, setOpenedPlaylist] = useState<OpenedSpotifyPlaylist | null>(null);

  function openSmartSearchPlaylist(result: SpotifySmartSearchResult) {
    if (!roomId || result.type === "track") return;

    setOpenedPlaylistPhase("loading");
    setOpenedPlaylistError(null);

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifyPlaylistDetailPayload) {
        socket.off(ServerToClientEvent.SpotifyPlaylistDetail, handleResult);

        if (payload.success) {
          setOpenedPlaylistPhase("ready");
          setOpenedPlaylist({
            id: payload.playlistId,
            title: payload.title,
            subtitle: payload.subtitle,
            ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
            totalFetched: payload.totalFetched,
            filteredCount: payload.filteredCount,
            tracks: payload.tracks,
          });
        } else {
          setOpenedPlaylistPhase("error");
          setOpenedPlaylistError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyPlaylistDetail, handleResult);
      socket.emit(ClientToServerEvent.OpenSpotifyPlaylist, {
        roomId,
        playlistId: result.id,
        sourceType: result.type,
      });
    });
  }

  function closeOpenedPlaylist() {
    setOpenedPlaylistPhase("idle");
    setOpenedPlaylistError(null);
    setOpenedPlaylist(null);
  }

  function removeOpenedPlaylistTrack(trackId: string) {
    setOpenedPlaylist((playlist) =>
      playlist
        ? {
            ...playlist,
            tracks: playlist.tracks.filter((track) => track.id !== trackId),
          }
        : playlist,
    );
  }

  function updateOpenedPlaylistTrack(trackId: string, patch: CandidateTrackUpdatePatch) {
    setOpenedPlaylist((playlist) =>
      playlist
        ? {
            ...playlist,
            tracks: playlist.tracks.map((track) =>
              track.id === trackId
                ? {
                    ...track,
                    ...patch,
                    sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
                    metadataStatus: patch.metadataStatus ?? track.metadataStatus,
                  }
                : track,
            ),
          }
        : playlist,
    );
  }

  function removeOpenedPlaylistTracksFromQueue(trackIds: ReadonlySet<string>) {
    if (!roomId || trackIds.size === 0) return;

    void getSocketClient().then((socket) => {
      function handleRemoveConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getQueuedSpotifyTrackIdsFromPlaylistTracks(payload.tracks));
        setSavedPlaylistMessage(
          t("lobby.spotify.builder.playlistTracksRemoved", { count: trackIds.size }),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
      socket.emit(ClientToServerEvent.RemovePlaylistTracks, {
        roomId,
        trackIds: Array.from(trackIds),
      });
    });
  }

  function applyOpenedPlaylistTracks(
    mode: PlaylistQueueUpdateMode,
    trackIds?: ReadonlySet<string>,
  ) {
    if (!roomId || !openedPlaylist) return;

    const playlist = openedPlaylist;
    const tracks =
      trackIds && trackIds.size > 0
        ? playlist.tracks.filter((track) => trackIds.has(track.id))
        : playlist.tracks;
    if (tracks.length === 0) return;

    setOpenedPlaylistPhase("applying");
    setOpenedPlaylistError(null);

    void getSocketClient().then((socket) => {
      function handleLoadConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getQueuedSpotifyTrackIdsFromPlaylistTracks(payload.tracks));
        setOpenedPlaylistPhase("ready");
        currentPlaylistNameRef.current = playlist.title;
        setSavedPlaylistMessage(
          t(
            mode === "append"
              ? "lobby.spotify.builder.playlistTracksAdded"
              : "lobby.spotify.builder.playlistTracksReplaced",
            { count: tracks.length },
          ),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
      socket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
        roomId,
        mode,
        tracks,
      });
    });
  }

  const resetOpenedPlaylist = useCallback(() => {
    setOpenedPlaylistPhase("idle");
    setOpenedPlaylistError(null);
    setOpenedPlaylist(null);
  }, []);

  return {
    applyOpenedPlaylistTracks,
    closeOpenedPlaylist,
    openedPlaylist,
    openedPlaylistError,
    openedPlaylistPhase,
    openSmartSearchPlaylist,
    removeOpenedPlaylistTrack,
    removeOpenedPlaylistTracksFromQueue,
    resetOpenedPlaylist,
    updateOpenedPlaylistTrack,
  };
}
