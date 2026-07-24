import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { SpotifySmartSearchResult, SpotifySmartSearchTypeFilter } from "@tunetrack/shared";
import {
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../../features/motion";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { TextInput } from "../../../../features/ui/TextInput";
import { SearchIcon } from "./spotifySetupIcons";
import { SpotifyOpenedPlaylistPanel } from "./SpotifyOpenedPlaylistPanel";
import { SpotifySmartSearchResultRow } from "./SpotifySmartSearchResultRow";
import { SMART_SEARCH_TYPES, type LobbySpotifyState } from "./spotifySetupTypes";
import styles from "./spotifyStyles";

export function SpotifyPlaylistSearchPanel({ spotifyState }: { spotifyState: LobbySpotifyState }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const { showToast } = useAppToast();
  const { openedPlaylist: openedPlaylistState, smartSearch } = spotifyState;
  const {
    addSmartSearchTrackToQueue,
    addSmartSearchTracksToQueue,
    loadMoreSpotifyMusic,
    removeSmartSearchTracksFromQueue,
    searchSpotifyMusic,
    searchSpotifyMusicByType,
    setSmartSearchQuery,
    setSmartSearchType,
    smartSearchError,
    smartSearchHasMore,
    smartSearchHasSearched,
    smartSearchLoadMorePhase,
    smartSearchPhase,
    smartSearchQuery,
    smartSearchQueuedTrackIds,
    smartSearchResults,
    smartSearchType,
  } = smartSearch;
  const {
    applyOpenedPlaylistTracks,
    closeOpenedPlaylist,
    openSmartSearchPlaylist,
    openedPlaylist,
    openedPlaylistError,
    openedPlaylistPhase,
    queuedTrackIds,
    removeOpenedPlaylistTracksFromQueue,
    updateOpenedPlaylistTrack,
  } = openedPlaylistState;

  const isSearching = smartSearchPhase === "searching";
  const isLoadingMore = smartSearchLoadMorePhase === "loading";
  const [selectedSearchTrackIds, setSelectedSearchTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedSearchTracks = smartSearchResults.filter(
    (result) => result.type === "track" && selectedSearchTrackIds.has(result.id),
  );
  const selectedUnqueuedSearchTracks = selectedSearchTracks.filter(
    (track) => !smartSearchQueuedTrackIds.has(track.id),
  );
  const selectedQueuedSearchTracks = selectedSearchTracks.filter((track) =>
    smartSearchQueuedTrackIds.has(track.id),
  );

  useEffect(() => {
    setSelectedSearchTrackIds((prev) => {
      if (prev.size === 0) return prev;
      const availableTrackIds = new Set(
        smartSearchResults.filter((result) => result.type === "track").map((result) => result.id),
      );
      const next = new Set([...prev].filter((trackId) => availableTrackIds.has(trackId)));
      return next.size === prev.size ? prev : next;
    });
  }, [smartSearchResults]);

  function toggleSearchTrackSelection(trackId: string) {
    setSelectedSearchTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function handleAddTrack(result: SpotifySmartSearchResult) {
    if (smartSearchQueuedTrackIds.has(result.id)) {
      showAlreadyQueuedToast(t("lobby.spotify.builder.trackAlreadyQueued"));
      return;
    }
    addSmartSearchTrackToQueue(result);
    showSearchToast(t("lobby.spotify.builder.trackAdded"));
  }

  function handleAddSelectedTracks() {
    if (selectedSearchTracks.length === 0) return;

    const tracksToAdd = selectedUnqueuedSearchTracks;
    if (tracksToAdd.length === 0) {
      showAlreadyQueuedToast(t("lobby.spotify.builder.tracksAlreadyQueued"));
      return;
    }

    addSmartSearchTracksToQueue(tracksToAdd);
    setSelectedSearchTrackIds(new Set());
    showSearchToast(t("lobby.spotify.builder.playlistTracksAdded", { count: tracksToAdd.length }));
  }

  function handleRemoveSelectedTracks() {
    if (selectedSearchTracks.length === 0) return;
    if (selectedQueuedSearchTracks.length === 0) return;

    removeSmartSearchTracksFromQueue(selectedQueuedSearchTracks);
    setSelectedSearchTrackIds(new Set());
    showSearchToast(
      t("lobby.spotify.builder.playlistTracksRemoved", {
        count: selectedQueuedSearchTracks.length,
      }),
    );
  }

  function handleRemoveTrack(result: SpotifySmartSearchResult) {
    if (!smartSearchQueuedTrackIds.has(result.id)) return;

    removeSmartSearchTracksFromQueue([result]);
    showSearchToast(t("lobby.spotify.builder.playlistTracksRemoved", { count: 1 }));
  }

  function handleOpenedAddAll() {
    if (!openedPlaylist || openedPlaylist.tracks.length === 0) return;

    const unqueuedTrackIds = new Set(
      openedPlaylist.tracks
        .filter((track) => !isOpenedTrackQueued(track.id))
        .map((track) => track.id),
    );
    if (unqueuedTrackIds.size === 0) {
      showAlreadyQueuedToast(t("lobby.spotify.builder.tracksAlreadyQueued"));
      return;
    }

    applyOpenedPlaylistTracks("append", unqueuedTrackIds);
    showSearchToast(getAddedTracksMessage(unqueuedTrackIds.size));
  }

  function handleOpenedAddSelected(trackIds: ReadonlySet<string>) {
    if (trackIds.size === 0) return;

    const unqueuedTrackIds = new Set(
      [...trackIds].filter((trackId) => !isOpenedTrackQueued(trackId)),
    );
    if (unqueuedTrackIds.size === 0) {
      showAlreadyQueuedToast(t("lobby.spotify.builder.tracksAlreadyQueued"));
      return;
    }

    applyOpenedPlaylistTracks("append", unqueuedTrackIds);
    showSearchToast(getAddedTracksMessage(unqueuedTrackIds.size));
  }

  function handleOpenedRemoveSelected(trackIds: ReadonlySet<string>) {
    if (trackIds.size === 0) return;
    removeOpenedPlaylistTracksFromQueue(trackIds);
    showSearchToast(getRemovedTracksMessage(trackIds.size));
  }

  function handleOpenedReplace() {
    if (!openedPlaylist || openedPlaylist.tracks.length === 0) return;
    applyOpenedPlaylistTracks("replace");
    showSearchToast(
      t("lobby.spotify.builder.playlistTracksReplaced", {
        count: openedPlaylist.tracks.length,
      }),
    );
  }

  function isOpenedTrackQueued(trackId: string) {
    return queuedTrackIds.has(trackId) || smartSearchQueuedTrackIds.has(trackId);
  }

  function getAddedTracksMessage(count: number) {
    return count === 1
      ? t("lobby.spotify.builder.trackAdded")
      : t("lobby.spotify.builder.playlistTracksAdded", { count });
  }

  function getRemovedTracksMessage(count: number) {
    return count === 1
      ? t("lobby.spotify.builder.trackRemoved")
      : t("lobby.spotify.builder.playlistTracksRemoved", { count });
  }

  function showSearchToast(message: string) {
    showToast({
      durationMs: 1100,
      id: "spotify-search-track-added",
      message,
      type: "success",
    });
  }

  function showAlreadyQueuedToast(message: string) {
    showToast({
      durationMs: 1600,
      id: "spotify-search-track-already-queued",
      message,
      type: "info",
    });
  }

  function handleSearchTypeChange(type: SpotifySmartSearchTypeFilter) {
    if (type === smartSearchType) return;
    if (smartSearchQuery.trim().length >= 2) {
      searchSpotifyMusicByType(type);
    } else {
      setSmartSearchType(type);
    }
  }

  return (
    <div className={styles.spotifyDiscoveryPanel}>
      {openedPlaylistPhase !== "idle" ? (
        <SpotifyOpenedPlaylistPanel
          onAddAll={handleOpenedAddAll}
          onAddSelected={handleOpenedAddSelected}
          onBack={closeOpenedPlaylist}
          onRemoveSelected={handleOpenedRemoveSelected}
          onReplace={handleOpenedReplace}
          onUpdateTrack={updateOpenedPlaylistTrack}
          phase={openedPlaylistPhase}
          playlist={openedPlaylist}
          playlistError={openedPlaylistError}
          queuedSpotifyTrackIds={smartSearchQueuedTrackIds}
          queuedTrackIds={queuedTrackIds}
        />
      ) : (
        <section className={styles.spotifyDiscoverySearch}>
          <div className={styles.spotifyDiscoveryToolbar}>
            <div className={styles.spotifySearchRow}>
              <TextInput
                aria-label={t("lobby.spotify.source.findPlaylists")}
                className={styles.spotifySearchInput}
                disabled={isSearching}
                onChange={(event) => setSmartSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") searchSpotifyMusic();
                }}
                placeholder={t("lobby.spotify.builder.searchPlaceholder")}
                type="search"
                value={smartSearchQuery}
              />
              <button
                aria-label={t("lobby.spotify.builder.search")}
                className={styles.spotifySearchIconBtn}
                disabled={smartSearchQuery.trim().length < 2 || isSearching}
                onClick={searchSpotifyMusic}
                type="button"
              >
                <SearchIcon />
              </button>
            </div>
            <div className={styles.spotifySearchTypeChips} role="tablist">
              {SMART_SEARCH_TYPES.map((type) => (
                <button
                  aria-selected={smartSearchType === type.value}
                  className={`${styles.spotifySearchTypeChip} ${
                    smartSearchType === type.value ? styles.spotifySearchTypeChipActive : ""
                  }`}
                  disabled={isSearching}
                  key={type.value}
                  onClick={() => handleSearchTypeChange(type.value)}
                  role="tab"
                  type="button"
                >
                  {t(type.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {smartSearchPhase === "error" && smartSearchError ? (
            <p
              className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError} ${styles.spotifyDiscoveryStatusOffset}`}
            >
              {smartSearchError}
            </p>
          ) : null}

          {smartSearchResults.length > 0 ? (
            <SmartSearchVirtualResultList
              hasMore={smartSearchHasMore}
              isLoadingMore={isLoadingMore}
              onAdd={handleAddTrack}
              onLoadMore={loadMoreSpotifyMusic}
              onOpenPlaylist={openSmartSearchPlaylist}
              onRemove={handleRemoveTrack}
              onToggleSelection={toggleSearchTrackSelection}
              queuedTrackIds={smartSearchQueuedTrackIds}
              results={smartSearchResults}
              selectedTrackIds={selectedSearchTrackIds}
              showSelectedActionPadding={selectedSearchTracks.length > 0}
            />
          ) : smartSearchHasSearched && smartSearchPhase === "idle" ? (
            <p className={`${styles.spotifyEmptyState} ${styles.spotifyDiscoveryStatusOffset}`}>
              {t("lobby.spotify.builder.noResults")}
            </p>
          ) : null}

          {selectedSearchTracks.length > 0 ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={styles.spotifySearchSelectedAction}
              initial={{ opacity: 0, y: 18 }}
              transition={createStandardTransition(reduceMotion)}
            >
              {selectedUnqueuedSearchTracks.length > 0 ? (
                <ActionButton
                  className={styles.spotifySearchAddSelectedBtn}
                  onClick={handleAddSelectedTracks}
                  type="button"
                  variant="neutral"
                >
                  {t("lobby.spotify.builder.addSelected", {
                    count: selectedUnqueuedSearchTracks.length,
                  })}
                </ActionButton>
              ) : null}
              {selectedQueuedSearchTracks.length > 0 ? (
                <ActionButton
                  className={`${styles.spotifySearchAddSelectedBtn} ${styles.spotifySearchRemoveSelectedBtn}`}
                  onClick={handleRemoveSelectedTracks}
                  type="button"
                  variant="danger"
                >
                  {t("lobby.spotify.builder.removeSelected", {
                    count: selectedQueuedSearchTracks.length,
                  })}
                </ActionButton>
              ) : null}
            </motion.div>
          ) : null}
        </section>
      )}
    </div>
  );
}

interface SmartSearchVirtualResultListProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onAdd: (result: SpotifySmartSearchResult) => void;
  onLoadMore: () => void;
  onOpenPlaylist: (result: SpotifySmartSearchResult) => void;
  onRemove: (result: SpotifySmartSearchResult) => void;
  onToggleSelection: (trackId: string) => void;
  queuedTrackIds: ReadonlySet<string>;
  results: SpotifySmartSearchResult[];
  selectedTrackIds: ReadonlySet<string>;
  showSelectedActionPadding: boolean;
}

function SmartSearchVirtualResultList({
  hasMore,
  isLoadingMore,
  onAdd,
  onLoadMore,
  onOpenPlaylist,
  onRemove,
  onToggleSelection,
  queuedTrackIds,
  results,
  selectedTrackIds,
  showSelectedActionPadding,
}: SmartSearchVirtualResultListProps) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 58,
    overscan: 8,
  });

  return (
    <div
      className={`${styles.spotifySmartResultList} ${
        showSelectedActionPadding ? styles.spotifySmartResultListWithAction : ""
      }`}
      ref={listRef}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const result = results[virtualItem.index];
          if (!result) {
            return null;
          }

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SpotifySmartSearchResultRow
                isAdded={queuedTrackIds.has(result.id)}
                isSelected={selectedTrackIds.has(result.id)}
                onAdd={() => onAdd(result)}
                onOpenPlaylist={() => onOpenPlaylist(result)}
                onRemove={() => onRemove(result)}
                onToggleSelection={() => onToggleSelection(result.id)}
                result={result}
              />
            </div>
          );
        })}
      </div>
      {hasMore ? (
        <button
          className={styles.spotifySearchMoreLink}
          disabled={isLoadingMore}
          onClick={onLoadMore}
          type="button"
        >
          {isLoadingMore
            ? t("lobby.spotify.builder.loadingMore")
            : t("lobby.spotify.builder.loadMore")}
        </button>
      ) : null}
    </div>
  );
}

