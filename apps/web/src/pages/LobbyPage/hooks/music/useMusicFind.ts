import type { SpotifyPlaylistSearchItem, SpotifySmartSearchResult } from "@tunetrack/shared/client";
import { useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import type { UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";
import { isPlaylistLink, type FindKind } from "./musicSetupSelectors";

const MIN_QUERY_LENGTH = 2;

export type FindResults =
  | { kind: "playlists"; playlists: SpotifyPlaylistSearchItem[] }
  | { kind: "music"; results: SpotifySmartSearchResult[] };

/**
 * One field for links and searches (`22` §4.8, Find): a pasted playlist link imports at once,
 * anything else searches the chosen type. Spotify login is never asked for here.
 */
export function useMusicFind(spotify: UseLobbySpotifyResult) {
  const { t } = useI18n();
  const { showToast } = useAppToast();
  const { import: playlistImport, playlistSearch, smartSearch } = spotify;
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<FindKind>("track");
  const [searchedPlaylistQuery, setSearchedPlaylistQuery] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const queued = smartSearch.smartSearchQueuedTrackIds;
  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;
  // A link that imported leaves the field; one that failed stays for a fix.
  const [lastImportPhase, setLastImportPhase] = useState(playlistImport.importPhase);
  if (playlistImport.importPhase !== lastImportPhase) {
    setLastImportPhase(playlistImport.importPhase);
    if (lastImportPhase === "importing" && playlistImport.importPhase === "idle") setQuery("");
  }

  const isPlaylistKind = kind === "playlist";
  const results: FindResults = isPlaylistKind
    ? {
        kind: "playlists",
        // A list found for an earlier query is not an answer to what the field says now.
        playlists: searchedPlaylistQuery === null ? [] : playlistSearch.playlistSearchResults,
      }
    : { kind: "music", results: smartSearch.smartSearchResults };
  const isSearching = isPlaylistKind
    ? playlistSearch.playlistSearchPhase === "searching"
    : smartSearch.smartSearchPhase === "searching";
  const searchError = isPlaylistKind
    ? playlistSearch.playlistSearchError
    : smartSearch.smartSearchError;
  const hasSearched = isPlaylistKind
    ? searchedPlaylistQuery !== null
    : smartSearch.smartSearchHasSearched;
  const resultCount =
    results.kind === "playlists" ? results.playlists.length : results.results.length;
  const selectedTracks = smartSearch.smartSearchResults.filter(
    (result) => result.type === "track" && selectedIds.has(result.id),
  );

  function changeQuery(value: string) {
    setQuery(value);
    setSearchedPlaylistQuery(null);
    smartSearch.setSmartSearchQuery(value);
    playlistSearch.setPlaylistSearchQuery(value);
    playlistImport.setPlaylistUrl(value);
  }

  function submit() {
    if (isPlaylistLink(query)) {
      playlistImport.importPlaylist();
      return;
    }
    if (!canSearch) return;
    endSelection();
    if (isPlaylistKind) {
      setSearchedPlaylistQuery(query.trim());
      playlistSearch.searchSpotifyPlaylists();
    } else {
      smartSearch.searchSpotifyMusic();
    }
  }

  function changeKind(nextKind: FindKind) {
    if (nextKind === kind) return;
    setKind(nextKind);
    endSelection();
    if (nextKind === "playlist") {
      if (canSearch) {
        setSearchedPlaylistQuery(query.trim());
        playlistSearch.searchSpotifyPlaylists();
      }
      return;
    }
    if (canSearch) smartSearch.searchSpotifyMusicByType(nextKind);
    else smartSearch.setSmartSearchType(nextKind);
  }

  function toggleTrack(result: SpotifySmartSearchResult) {
    if (queued.has(result.id)) {
      smartSearch.removeSmartSearchTracksFromQueue([result]);
      showSuccess(t("lobby.spotify.builder.trackRemoved"));
    } else {
      smartSearch.addSmartSearchTrackToQueue(result);
      showSuccess(t("lobby.spotify.builder.trackAdded"));
    }
  }

  function toggleSelected(trackId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function addSelected() {
    const tracksToAdd = selectedTracks.filter((track) => !queued.has(track.id));
    if (tracksToAdd.length > 0) {
      smartSearch.addSmartSearchTracksToQueue(tracksToAdd);
      showSuccess(t("lobby.spotify.builder.playlistTracksAdded", { count: tracksToAdd.length }));
    }
    endSelection();
  }

  function removeSelected() {
    const tracksToRemove = selectedTracks.filter((track) => queued.has(track.id));
    if (tracksToRemove.length > 0) {
      smartSearch.removeSmartSearchTracksFromQueue(tracksToRemove);
      showSuccess(
        t("lobby.spotify.builder.playlistTracksRemoved", { count: tracksToRemove.length }),
      );
    }
    endSelection();
  }

  function startSelection() {
    setIsSelecting(true);
  }

  function endSelection() {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }

  function showSuccess(message: string) {
    showToast({ durationMs: 1100, id: "music-find-track", message, type: "success" });
  }

  return {
    addSelected,
    canSearch,
    changeKind,
    changeQuery,
    endSelection,
    hasSearched,
    hasMore: !isPlaylistKind && smartSearch.smartSearchHasMore,
    isImporting: playlistImport.importPhase === "importing",
    isLoadingMore: smartSearch.smartSearchLoadMorePhase === "loading",
    isSearching,
    isSelecting,
    importError: playlistImport.importPhase === "error" ? playlistImport.importError : null,
    kind,
    loadMore: smartSearch.loadMoreSpotifyMusic,
    query,
    queued,
    removeSelected,
    resultCount,
    results,
    searchError,
    selectedIds,
    selectedQueuedCount: selectedTracks.filter((track) => queued.has(track.id)).length,
    selectedUnqueuedCount: selectedTracks.filter((track) => !queued.has(track.id)).length,
    startSelection,
    submit,
    toggleSelected,
    toggleTrack,
  };
}

export type MusicFindState = ReturnType<typeof useMusicFind>;
