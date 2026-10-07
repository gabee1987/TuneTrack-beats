import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type {
  SpotifySmartSearchResult,
  SpotifySmartSearchTypeFilter,
} from "@tunetrack/shared/client";
import { createStandardTransition, useReducedMotionPreference } from "../../../../features/motion";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { TextInput } from "../../../../features/ui/TextInput";
import { SearchIcon } from "./spotifySetupIcons";
import { SpotifyOpenedPlaylistPanel } from "./SpotifyOpenedPlaylistPanel";
import { SpotifySmartSearchResultRow } from "./SpotifySmartSearchResultRow";
import { SMART_SEARCH_TYPES, type LobbySpotifyState } from "./spotifySetupTypes";
import discoveryStyles from "./spotifyDiscovery.module.css";
import sharedStyles from "./spotifyShared.module.css";
import panelsStyles from "./spotifyPanels.module.css";

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
    <div className={discoveryStyles.spotifyDiscoveryPanel}>
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
        <section className={discoveryStyles.spotifyDiscoverySearch}>
          <div className={discoveryStyles.spotifyDiscoveryToolbar}>
            <div className={discoveryStyles.spotifySearchRow}>
              <TextInput
                aria-label={t("lobby.spotify.source.findPlaylists")}
                className={discoveryStyles.spotifySearchInput}
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
                className={discoveryStyles.spotifySearchIconBtn}
                disabled={smartSearchQuery.trim().length < 2 || isSearching}
                onClick={searchSpotifyMusic}
                type="button"
              >
                <SearchIcon />
              </button>
            </div>
            <div className={discoveryStyles.spotifySearchTypeChips} role="tablist">
              {SMART_SEARCH_TYPES.map((type) => (
                <button
                  aria-selected={smartSearchType === type.value}
                  className={`${discoveryStyles.spotifySearchTypeChip} ${
                    smartSearchType === type.value
                      ? discoveryStyles.spotifySearchTypeChipActive
                      : ""
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
              className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError} ${discoveryStyles.spotifyDiscoveryStatusOffset}`}
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
            <p
              className={`${panelsStyles.spotifyEmptyState} ${discoveryStyles.spotifyDiscoveryStatusOffset}`}
            >
              {t("lobby.spotify.builder.noResults")}
            </p>
          ) : null}

          {selectedSearchTracks.length > 0 ? (
            <m.div
              animate={{ opacity: 1, y: 0 }}
              className={discoveryStyles.spotifySearchSelectedAction}
              initial={{ opacity: 0, y: 18 }}
              transition={createStandardTransition(reduceMotion)}
            >
              {selectedUnqueuedSearchTracks.length > 0 ? (
                <ActionButton
                  className={discoveryStyles.spotifySearchAddSelectedBtn}
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
                  className={`${discoveryStyles.spotifySearchAddSelectedBtn} ${discoveryStyles.spotifySearchRemoveSelectedBtn}`}
                  onClick={handleRemoveSelectedTracks}
                  type="button"
                  variant="danger"
                >
                  {t("lobby.spotify.builder.removeSelected", {
                    count: selectedQueuedSearchTracks.length,
                  })}
                </ActionButton>
              ) : null}
            </m.div>
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
      className={`${discoveryStyles.spotifySmartResultList} ${
        showSelectedActionPadding ? discoveryStyles.spotifySmartResultListWithAction : ""
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
          className={discoveryStyles.spotifySearchMoreLink}
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
