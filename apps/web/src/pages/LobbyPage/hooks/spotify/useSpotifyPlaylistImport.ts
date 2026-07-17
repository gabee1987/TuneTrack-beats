import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ImportPlaylistResultPayload,
  type PlaylistTracksPayload,
  type SpotifyPlaylistSearchItem,
} from "@tunetrack/shared";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useI18n } from "../../../../features/i18n";
import { localizePlaylistImportError } from "../../../../features/i18n/localizedErrors";
import { getSocketClient } from "../../../../services/socket/socketClient";
import {
  getCurrentPlaylistTracks,
  getQueuedTrackIdsFromPlaylistTracks,
  getQueuedSpotifyTrackIdsFromPlaylistTracks,
} from "./spotifyQueueTrackIds";
import type { ImportPhase } from "./lobbySpotify.types";

interface UseSpotifyPlaylistImportParams {
  clearPlaylistSearch: () => void;
  currentPlaylistNameRef: MutableRefObject<string | undefined>;
  roomId: string | undefined;
  setLoadedSavedPlaylistId: (playlistId: string | null) => void;
  setQueuedTrackIds: (trackIds: Set<string>) => void;
  setSavedPlaylistMessage: (message: string | null) => void;
  setSmartSearchQueuedTrackIds: (trackIds: Set<string>) => void;
}

export function useSpotifyPlaylistImport({
  clearPlaylistSearch,
  currentPlaylistNameRef,
  roomId,
  setLoadedSavedPlaylistId,
  setQueuedTrackIds,
  setSavedPlaylistMessage,
  setSmartSearchQueuedTrackIds,
}: UseSpotifyPlaylistImportParams) {
  const { t } = useI18n();
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [currentPlaylistSourceUrl, setCurrentPlaylistSourceUrl] = useState("");
  const [importContentHeight, setImportContentHeight] = useState(0);
  const importContentRef = useRef<HTMLDivElement>(null);
  const pendingImportPlaylistUrlRef = useRef("");

  useLayoutEffect(() => {
    const el = importContentRef.current;
    if (!el) return;

    const update = () => setImportContentHeight(el.scrollHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function importPlaylistValue(value: string) {
    if (!roomId || !value.trim()) return;

    setImportPhase("importing");
    setImportError(null);
    pendingImportPlaylistUrlRef.current = value.trim();

    void getSocketClient().then((socket) => {
      socket.emit(ClientToServerEvent.ImportPlaylist, {
        roomId,
        playlistUrl: pendingImportPlaylistUrlRef.current,
      });
    });
  }

  function importPlaylist() {
    importPlaylistValue(playlistUrl);
  }

  function importPlaylistSearchResult(playlist: SpotifyPlaylistSearchItem) {
    importPlaylistValue(`https://open.spotify.com/playlist/${playlist.id}`);
    clearPlaylistSearch();
  }

  function clearCurrentPlaylist() {
    if (!roomId) return;

    void getCurrentPlaylistTracks(roomId).then((tracks) => {
      if (tracks.length === 0) {
        setSavedPlaylistMessage(t("lobby.spotify.clearPlaylistNoTracks"));
        return;
      }

      void getSocketClient().then((socket) => {
        function handleClearConfirmed(payload: PlaylistTracksPayload) {
          socket.off(ServerToClientEvent.PlaylistTracks, handleClearConfirmed);
          setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
          setSmartSearchQueuedTrackIds(getQueuedSpotifyTrackIdsFromPlaylistTracks(payload.tracks));
          setLoadedSavedPlaylistId(null);
          setCurrentPlaylistSourceUrl("");
          currentPlaylistNameRef.current = undefined;
          setSavedPlaylistMessage(t("lobby.spotify.clearPlaylistDone"));
        }

        socket.once(ServerToClientEvent.PlaylistTracks, handleClearConfirmed);
        socket.emit(ClientToServerEvent.RemovePlaylistTracks, {
          roomId,
          trackIds: tracks.map((track) => track.id),
        });
      });
    });
  }

  const handleImportResult = useCallback(
    (payload: ImportPlaylistResultPayload) => {
      if (payload.success) {
        setImportPhase("idle");
        setImportError(null);
        setCurrentPlaylistSourceUrl(pendingImportPlaylistUrlRef.current);
        currentPlaylistNameRef.current = payload.playlistName;
        setLoadedSavedPlaylistId(null);
        setPlaylistUrl("");
        setSmartSearchQueuedTrackIds(new Set());
      } else {
        setImportPhase("error");
        setImportError(localizePlaylistImportError(t, payload));
      }
    },
    [currentPlaylistNameRef, setLoadedSavedPlaylistId, setSmartSearchQueuedTrackIds, t],
  );

  const resetImport = useCallback(() => {
    setImportPhase("idle");
    setImportError(null);
  }, []);

  return {
    clearCurrentPlaylist,
    currentPlaylistSourceUrl,
    handleImportResult,
    importContentHeight,
    importContentRef,
    importError,
    importPhase,
    importPlaylist,
    importPlaylistSearchResult,
    playlistUrl,
    resetImport,
    setPlaylistUrl,
  };
}
