import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlaylistTracksPayload,
  type SpotifySmartSearchResult,
  type SpotifySmartSearchResultPayload,
  type SpotifySmartSearchTypeFilter,
} from "@tunetrack/shared";
import { useCallback, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { getSocketClient } from "../../../../services/socket/socketClient";
import {
  getQueuedTrackIdsFromPlaylistTracks,
  getQueuedSpotifyTrackIdsFromPlaylistTracks,
  getRemovableTrackIdsForSmartSearchResults,
  appendUniqueSmartSearchResults,
  mapSmartSearchResultToTrack,
} from "./spotifyQueueTrackIds";
import type { SmartSearchLoadMorePhase, SmartSearchPhase } from "./lobbySpotify.types";

interface UseSpotifySmartSearchParams {
  closeOpenedPlaylist: () => void;
  roomId: string | undefined;
  setQueuedTrackIds: (trackIds: Set<string>) => void;
  setSavedPlaylistMessage: (message: string | null) => void;
  setSmartSearchQueuedTrackIds: (trackIds: Set<string>) => void;
  smartSearchQueuedTrackIds: ReadonlySet<string>;
}

export function useSpotifySmartSearch({
  closeOpenedPlaylist,
  roomId,
  setQueuedTrackIds,
  setSavedPlaylistMessage,
  setSmartSearchQueuedTrackIds,
  smartSearchQueuedTrackIds,
}: UseSpotifySmartSearchParams) {
  const { t } = useI18n();
  const [smartSearchPhase, setSmartSearchPhase] = useState<SmartSearchPhase>("idle");
  const [smartSearchLoadMorePhase, setSmartSearchLoadMorePhase] =
    useState<SmartSearchLoadMorePhase>("idle");
  const [smartSearchError, setSmartSearchError] = useState<string | null>(null);
  const [smartSearchHasSearched, setSmartSearchHasSearched] = useState(false);
  const [smartSearchHasMore, setSmartSearchHasMore] = useState(false);
  const [smartSearchNextOffset, setSmartSearchNextOffset] = useState(0);
  const [smartSearchQuery, setSmartSearchQuery] = useState("");
  const [smartSearchType, setSmartSearchType] = useState<SpotifySmartSearchTypeFilter>("track");
  const [smartSearchResults, setSmartSearchResults] = useState<SpotifySmartSearchResult[]>([]);

  function searchSpotifyMusic() {
    searchSpotifyMusicByType(smartSearchType);
  }

  function searchSpotifyMusicByType(type: SpotifySmartSearchTypeFilter) {
    if (!roomId || smartSearchQuery.trim().length < 2) return;

    setSmartSearchType(type);
    setSmartSearchPhase("searching");
    setSmartSearchLoadMorePhase("idle");
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSavedPlaylistMessage(null);
    requestSpotifyMusicSearch(0, "replace", type);
  }

  function loadMoreSpotifyMusic() {
    if (
      !roomId ||
      smartSearchQuery.trim().length < 2 ||
      !smartSearchHasMore ||
      smartSearchLoadMorePhase === "loading"
    ) {
      return;
    }

    setSmartSearchLoadMorePhase("loading");
    setSmartSearchError(null);
    requestSpotifyMusicSearch(smartSearchNextOffset, "append", smartSearchType);
  }

  function requestSpotifyMusicSearch(
    offset: number,
    mode: "replace" | "append",
    type: SpotifySmartSearchTypeFilter,
  ) {
    if (!roomId) return;

    const activeRoomId = roomId;
    const query = smartSearchQuery.trim();

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifySmartSearchResultPayload) {
        socket.off(ServerToClientEvent.SpotifySmartSearchResult, handleResult);

        if (payload.success) {
          setSmartSearchPhase("idle");
          setSmartSearchLoadMorePhase("idle");
          setSmartSearchHasSearched(true);
          setSmartSearchHasMore(payload.hasMore);
          setSmartSearchNextOffset(payload.nextOffset ?? payload.offset + payload.limit);
          setSmartSearchResults((current) =>
            mode === "append"
              ? appendUniqueSmartSearchResults(current, payload.results)
              : payload.results,
          );
        } else {
          setSmartSearchPhase("error");
          setSmartSearchLoadMorePhase("idle");
          setSmartSearchError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifySmartSearchResult, handleResult);
      socket.emit(ClientToServerEvent.SearchSpotifyMusic, {
        roomId: activeRoomId,
        query,
        limit: 20,
        offset,
        types: [type],
      });
    });
  }

  function addSmartSearchTrackToQueue(result: SpotifySmartSearchResult) {
    addSmartSearchTracksToQueue([result]);
  }

  function addSmartSearchTracksToQueue(results: SpotifySmartSearchResult[]) {
    if (!roomId) return;

    const tracks = results
      .filter((result) => !smartSearchQueuedTrackIds.has(result.id))
      .flatMap(mapSmartSearchResultToTrack);
    if (tracks.length === 0) return;

    void getSocketClient().then((socket) => {
      function handleLoadConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getQueuedSpotifyTrackIdsFromPlaylistTracks(payload.tracks));
        setSavedPlaylistMessage(
          tracks.length === 1
            ? t("lobby.spotify.builder.trackAdded")
            : t("lobby.spotify.builder.playlistTracksAdded", { count: tracks.length }),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleLoadConfirmed);
      socket.emit(ClientToServerEvent.LoadCuratedPlaylist, {
        roomId,
        mode: "append",
        tracks,
      });
    });
  }

  function removeSmartSearchTracksFromQueue(results: SpotifySmartSearchResult[]) {
    if (!roomId) return;

    const trackIds = getRemovableTrackIdsForSmartSearchResults(results);
    if (trackIds.length === 0) return;

    void getSocketClient().then((socket) => {
      function handleRemoveConfirmed(payload: PlaylistTracksPayload) {
        socket.off(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
        setQueuedTrackIds(getQueuedTrackIdsFromPlaylistTracks(payload.tracks));
        setSmartSearchQueuedTrackIds(getQueuedSpotifyTrackIdsFromPlaylistTracks(payload.tracks));
        setSavedPlaylistMessage(
          t("lobby.spotify.builder.playlistTracksRemoved", { count: results.length }),
        );
      }

      socket.once(ServerToClientEvent.PlaylistTracks, handleRemoveConfirmed);
      socket.emit(ClientToServerEvent.RemovePlaylistTracks, {
        roomId,
        trackIds,
      });
    });
  }

  function handleSetSmartSearchQuery(query: string) {
    setSmartSearchQuery(query);
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSmartSearchResults([]);
    closeOpenedPlaylist();
  }

  function handleSetSmartSearchType(type: SpotifySmartSearchTypeFilter) {
    setSmartSearchType(type);
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSmartSearchResults([]);
    closeOpenedPlaylist();
  }

  const resetSmartSearch = useCallback(() => {
    setSmartSearchPhase("idle");
    setSmartSearchLoadMorePhase("idle");
    setSmartSearchError(null);
    setSmartSearchHasSearched(false);
    setSmartSearchHasMore(false);
    setSmartSearchNextOffset(0);
    setSmartSearchResults([]);
  }, []);

  return {
    addSmartSearchTrackToQueue,
    addSmartSearchTracksToQueue,
    loadMoreSpotifyMusic,
    removeSmartSearchTracksFromQueue,
    resetSmartSearch,
    searchSpotifyMusic,
    searchSpotifyMusicByType,
    setSmartSearchQuery: handleSetSmartSearchQuery,
    setSmartSearchType: handleSetSmartSearchType,
    smartSearchError,
    smartSearchHasMore,
    smartSearchHasSearched,
    smartSearchLoadMorePhase,
    smartSearchPhase,
    smartSearchQuery,
    smartSearchResults,
    smartSearchType,
  };
}
