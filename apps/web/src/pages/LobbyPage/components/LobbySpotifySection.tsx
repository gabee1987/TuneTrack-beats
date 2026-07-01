import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  SPOTIFY_QUICK_PICK_PRESETS,
  type PublicRoomSettings,
  type SpotifyPlaylistSearchItem,
  type SpotifySmartSearchResult,
} from "@tunetrack/shared";
import { createStandardTransition } from "../../../features/motion";
import { useI18n } from "../../../features/i18n";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { SettingInfoButton } from "../../../features/ui/SettingField";
import { TextInput } from "../../../features/ui/TextInput";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { useAppToast } from "../../../features/toast";
import { LobbySectionHeader } from "./LobbySectionHeader";
import { PlaylistEditModal } from "./PlaylistEditModal";
import { SelectableArtwork, SelectableArtworkImage } from "./SelectableArtwork";
import { PlaylistTrackDetailsSheet } from "./PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "./PlaylistTrackList";
import { AdaptiveSelect } from "./AdaptiveSelect";
import { useLobbySpotify } from "../hooks/useLobbySpotify";
import lobbyStyles from "../LobbyPage.module.css";
import styles from "./LobbySpotifySection.module.css";

interface LobbySpotifySectionProps {
  currentSettings: PublicRoomSettings;
}

type LobbySpotifyState = ReturnType<typeof useLobbySpotify>;
type SpotifySetupSource = "playlistUrl" | "findPlaylists" | "filters" | "quickPicks";
const SMART_SEARCH_SWIPE_THRESHOLD = 68;
const SMART_SEARCH_SWIPE_REVEAL_WIDTH = 82;

function SpotifyLogo() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={20}
      viewBox="0 0 24 24"
      width={20}
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function LobbySpotifySection({ currentSettings }: LobbySpotifySectionProps) {
  const { t } = useI18n();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<SpotifySetupSource>("playlistUrl");
  const spotifyState = useLobbySpotify();
  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const accountType = spotifyState.accountType ?? currentSettings.spotifyAccountType;
  const isConnecting = spotifyState.authPhase === "connecting";

  useEffect(() => {
    if (isSetupOpen && spotifyState.generatedPlaylistMessage) {
      setActiveSource("playlistUrl");
    }
  }, [isSetupOpen, spotifyState.generatedPlaylistMessage]);

  const connectHint = isConnected
    ? accountType === "premium"
      ? t("lobby.spotify.browserPlaybackHint")
      : t("lobby.spotify.previewPlaybackHint")
    : isConnecting
      ? t("lobby.spotify.connectingHint")
      : t("lobby.spotify.unconnectedHint");

  return (
    <>
      <SurfaceCard className={lobbyStyles.settingsGroup}>
        <LobbySectionHeader
          description={t("lobby.spotify.description")}
          title={t("lobby.spotify.title")}
          titleAccessory={<SpotifyInfoButton />}
          titleAs="h3"
          variant="compact"
        />

        <div className={styles.spotifySetupSummary}>
          <div className={styles.spotifyConnectRow}>
            {isConnected ? (
              <div className={styles.spotifyConnectedState}>
                <div className={styles.spotifyBadgeRow}>
                  <span className={styles.spotifyConnectedBadge}>
                    <span className={styles.spotifyConnectedDot} />
                    {t("lobby.spotify.connected")}
                  </span>
                  {accountType ? <SpotifyAccountBadge accountType={accountType} /> : null}
                </div>

                {isImported ? (
                  <div className={styles.spotifySongsReady}>
                    <span className={styles.spotifySongsReadyDot} />
                    <span>
                      {t("lobby.spotify.tracksQueued", {
                        count: currentSettings.importedTrackCount,
                      })}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={styles.spotifyConnectUnconnected}>
                <p className={styles.spotifyConnectHint}>{connectHint}</p>
              </div>
            )}
          </div>

          {isConnected ? <p className={styles.spotifyConnectHint}>{connectHint}</p> : null}

          {spotifyState.authPhase === "error" && spotifyState.authError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {spotifyState.authError}
            </p>
          ) : null}

          <ActionButton
            className={styles.spotifySetupOpenBtn}
            onClick={() => setIsSetupOpen(true)}
            type="button"
            variant="neutral"
          >
            <SpotifyLogo />
            {isImported ? t("lobby.spotify.openSetupReady") : t("lobby.spotify.openSetup")}
          </ActionButton>
        </div>
      </SurfaceCard>

      <SpotifySetupModal
        activeSource={activeSource}
        currentSettings={currentSettings}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSourceChange={setActiveSource}
        spotifyState={spotifyState}
      />
      <PlaylistEditModal
        isOpen={spotifyState.isEditModalOpen}
        onClose={spotifyState.closeEditModal}
      />
    </>
  );
}

function SpotifyInfoButton() {
  const { t } = useI18n();
  const spotifyInfo: ReactNode = (
    <span className={lobbyStyles.ttInfoStack}>
      <span>
        <strong>{t("lobby.spotify.info.overviewTitle")}</strong>
        <span>{t("lobby.spotify.info.overviewBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.connectTitle")}</strong>
        <span>{t("lobby.spotify.info.connectBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.playbackTitle")}</strong>
        <span>{t("lobby.spotify.info.playbackBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.playlistTitle")}</strong>
        <span>{t("lobby.spotify.info.playlistBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.editTitle")}</strong>
        <span>{t("lobby.spotify.info.editBody")}</span>
      </span>
      <span>
        <strong>{t("lobby.spotify.info.playersTitle")}</strong>
        <span>{t("lobby.spotify.info.playersBody")}</span>
      </span>
    </span>
  );

  return <SettingInfoButton info={spotifyInfo} label={t("lobby.spotify.infoLabel")} />;
}

function SpotifyAccountBadge({ accountType }: { accountType: "free" | "premium" }) {
  const { t } = useI18n();

  return (
    <span
      className={accountType === "premium" ? styles.spotifyPremiumBadge : styles.spotifyFreeBadge}
    >
      {accountType === "premium" ? `✦ ${t("lobby.spotify.premium")}` : t("lobby.spotify.free")}
    </span>
  );
}

interface SpotifySetupModalProps {
  activeSource: SpotifySetupSource;
  currentSettings: PublicRoomSettings;
  isOpen: boolean;
  onClose: () => void;
  onSourceChange: (source: SpotifySetupSource) => void;
  spotifyState: LobbySpotifyState;
}

function SpotifySetupModal({
  activeSource,
  currentSettings,
  isOpen,
  onClose,
  onSourceChange,
  spotifyState,
}: SpotifySetupModalProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      animate="animate"
      className={styles.spotifySetupOverlay}
      initial="exit"
      onClick={onClose}
      transition={createStandardTransition(reduceMotion)}
      variants={{
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }}
    >
      <motion.div
        animate="animate"
        aria-label={t("lobby.spotify.setupLabel")}
        aria-modal="true"
        className={styles.spotifySetupSheet}
        initial="exit"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        transition={createStandardTransition(reduceMotion)}
        variants={
          reduceMotion
            ? {
                animate: { opacity: 1 },
                exit: { opacity: 0 },
              }
            : {
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 24 },
              }
        }
      >
        <div className={styles.spotifySetupHeader}>
          <div className={styles.spotifySourceTabs} role="tablist">
            <SpotifySourceTab
              isActive={activeSource === "playlistUrl"}
              label={t("lobby.spotify.source.playlistUrl")}
              onClick={() => onSourceChange("playlistUrl")}
            />
            <SpotifySourceTab
              isActive={activeSource === "findPlaylists"}
              label={t("lobby.spotify.source.findPlaylists")}
              onClick={() => onSourceChange("findPlaylists")}
            />
            <SpotifySourceTab
              disabled
              isActive={activeSource === "filters"}
              label={t("lobby.spotify.source.filters")}
              onClick={() => onSourceChange("filters")}
            />
            <SpotifySourceTab
              isActive={activeSource === "quickPicks"}
              label={t("lobby.spotify.source.quickPicks")}
              onClick={() => onSourceChange("quickPicks")}
            />
          </div>

          <div className={styles.spotifySetupHeaderActions}>
            <CloseIconButton ariaLabel={t("lobby.spotify.closeSetup")} onClick={onClose} />
          </div>
        </div>

        <div className={styles.spotifySetupBody}>
          {activeSource === "findPlaylists" ? (
            <SpotifyPlaylistSearchPanel spotifyState={spotifyState} />
          ) : activeSource === "quickPicks" ? (
            <SpotifyQuickPicksPanel spotifyState={spotifyState} />
          ) : (
            <SpotifySetupContent currentSettings={currentSettings} spotifyState={spotifyState} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SpotifySourceTabProps {
  disabled?: boolean;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

function SpotifySourceTab({ disabled, isActive, label, onClick }: SpotifySourceTabProps) {
  return (
    <button
      aria-selected={isActive}
      className={`${styles.spotifySourceTab} ${isActive ? styles.spotifySourceTabActive : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SpotifyPlaylistSearchPanel({ spotifyState }: { spotifyState: LobbySpotifyState }) {
  const { t } = useI18n();
  const { showToast } = useAppToast();
  const {
    addSmartSearchTrackToQueue,
    addSmartSearchTracksToQueue,
    applyOpenedPlaylistTracks,
    closeOpenedPlaylist,
    loadMoreSpotifyMusic,
    openSmartSearchPlaylist,
    openedPlaylist,
    openedPlaylistError,
    openedPlaylistPhase,
    removeOpenedPlaylistTrack,
    removeSmartSearchTracksFromQueue,
    savedPlaylistMessage,
    searchSpotifyMusic,
    setSmartSearchQuery,
    smartSearchError,
    smartSearchHasSearched,
    smartSearchHasMore,
    smartSearchLoadMorePhase,
    smartSearchPhase,
    smartSearchQuery,
    smartSearchQueuedTrackIds,
    smartSearchResults,
    updateOpenedPlaylistTrack,
  } = spotifyState;

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
    if (smartSearchQueuedTrackIds.has(result.id)) return;
    addSmartSearchTrackToQueue(result);
    showSearchToast(t("lobby.spotify.builder.trackAdded"));
  }

  function handleAddSelectedTracks() {
    if (selectedSearchTracks.length === 0) return;

    const tracksToAdd = selectedUnqueuedSearchTracks;
    if (tracksToAdd.length === 0) return;

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

  function showSearchToast(message: string) {
    showToast({
      durationMs: 1100,
      id: "spotify-search-track-added",
      message,
      type: "success",
    });
  }

  return (
    <div className={styles.spotifyDiscoveryPanel}>
      {openedPlaylistPhase !== "idle" ? (
        <>
          <SpotifyOpenedPlaylistPanel
            onAddAll={() => applyOpenedPlaylistTracks("append")}
            onAddSelected={(trackIds) => applyOpenedPlaylistTracks("append", trackIds)}
            onBack={closeOpenedPlaylist}
            onRemoveTrack={removeOpenedPlaylistTrack}
            onReplace={() => applyOpenedPlaylistTracks("replace")}
            onUpdateTrack={updateOpenedPlaylistTrack}
            phase={openedPlaylistPhase}
            playlist={openedPlaylist}
            playlistError={openedPlaylistError}
          />
          {savedPlaylistMessage ? (
            <p className={styles.spotifyStatusLine}>{savedPlaylistMessage}</p>
          ) : null}
        </>
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
          </div>

          {smartSearchPhase === "error" && smartSearchError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {smartSearchError}
            </p>
          ) : null}

          {smartSearchResults.length > 0 ? (
            <div
              className={`${styles.spotifySmartResultList} ${
                selectedSearchTracks.length > 0 ? styles.spotifySmartResultListWithAction : ""
              }`}
            >
              {smartSearchResults.map((result) => (
                <SpotifySmartSearchResultRow
                  key={`${result.type}-${result.id}`}
                  isAdded={smartSearchQueuedTrackIds.has(result.id)}
                  isSelected={selectedSearchTrackIds.has(result.id)}
                  onAdd={() => handleAddTrack(result)}
                  onOpenPlaylist={() => openSmartSearchPlaylist(result)}
                  onRemove={() => handleRemoveTrack(result)}
                  onToggleSelection={() => toggleSearchTrackSelection(result.id)}
                  result={result}
                />
              ))}
              {smartSearchHasMore ? (
                <button
                  className={styles.spotifySearchMoreLink}
                  disabled={isLoadingMore}
                  onClick={loadMoreSpotifyMusic}
                  type="button"
                >
                  {isLoadingMore
                    ? t("lobby.spotify.builder.loadingMore")
                    : t("lobby.spotify.builder.loadMore")}
                </button>
              ) : null}
            </div>
          ) : smartSearchHasSearched && smartSearchPhase === "idle" ? (
            <p className={styles.spotifyEmptyState}>{t("lobby.spotify.builder.noResults")}</p>
          ) : null}

          {selectedSearchTracks.length > 0 ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={styles.spotifySearchSelectedAction}
              initial={{ opacity: 0, y: 18 }}
              transition={createStandardTransition(false)}
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

interface SpotifySmartSearchResultRowProps {
  isAdded: boolean;
  isSelected: boolean;
  onAdd: () => void;
  onOpenPlaylist: () => void;
  onRemove: () => void;
  onToggleSelection: () => void;
  result: SpotifySmartSearchResult;
}

function SpotifySmartSearchResultRow({
  isAdded,
  isSelected,
  onAdd,
  onOpenPlaylist,
  onRemove,
  onToggleSelection,
  result,
}: SpotifySmartSearchResultRowProps) {
  const { t } = useI18n();
  const x = useMotionValue(0);
  const addZoneWidth = useMotionValue(0);
  const removeZoneWidth = useMotionValue(0);
  const addIconOpacity = useTransform(
    addZoneWidth,
    [0, 40, SMART_SEARCH_SWIPE_REVEAL_WIDTH],
    [0, 0, 1],
  );
  const addIconScale = useTransform(addZoneWidth, [40, SMART_SEARCH_SWIPE_REVEAL_WIDTH], [0.6, 1]);
  const removeIconOpacity = useTransform(
    removeZoneWidth,
    [0, 40, SMART_SEARCH_SWIPE_REVEAL_WIDTH],
    [0, 0, 1],
  );
  const removeIconScale = useTransform(
    removeZoneWidth,
    [40, SMART_SEARCH_SWIPE_REVEAL_WIDTH],
    [0.6, 1],
  );
  const isActing = useRef(false);
  const isTrack = result.type === "track";

  useEffect(() => {
    return x.on("change", (value) => {
      if (isActing.current) return;
      addZoneWidth.set(Math.max(0, value));
      removeZoneWidth.set(Math.max(0, -value));
    });
  }, [addZoneWidth, removeZoneWidth, x]);

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!isTrack || isActing.current) return;

    if (!isAdded && info.offset.x > SMART_SEARCH_SWIPE_THRESHOLD) {
      isActing.current = true;
      await animate(x, SMART_SEARCH_SWIPE_REVEAL_WIDTH, {
        duration: 0.14,
        ease: [0.2, 0, 0, 1],
      });
      onAdd();
      await animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
      addZoneWidth.set(0);
      removeZoneWidth.set(0);
      isActing.current = false;
      return;
    }

    if (isAdded && info.offset.x < -SMART_SEARCH_SWIPE_THRESHOLD) {
      isActing.current = true;
      await animate(x, -SMART_SEARCH_SWIPE_REVEAL_WIDTH, {
        duration: 0.14,
        ease: [0.2, 0, 0, 1],
      });
      onRemove();
      await animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
      addZoneWidth.set(0);
      removeZoneWidth.set(0);
      isActing.current = false;
      return;
    }

    void animate(x, 0, { type: "spring", stiffness: 500, damping: 38 });
  }

  return (
    <div className={styles.spotifySmartResultRowWrapper}>
      {isTrack ? (
        <motion.div className={styles.spotifySmartAddZone} style={{ width: addZoneWidth }}>
          <motion.div style={{ opacity: addIconOpacity, scale: addIconScale }}>
            <PlusIcon />
          </motion.div>
        </motion.div>
      ) : null}
      {isTrack ? (
        <motion.div className={styles.spotifySmartRemoveZone} style={{ width: removeZoneWidth }}>
          <motion.div style={{ opacity: removeIconOpacity, scale: removeIconScale }}>
            <TrashIcon />
          </motion.div>
        </motion.div>
      ) : null}
      <motion.div
        className={styles.spotifySmartResultRow}
        drag={isTrack ? "x" : false}
        dragConstraints={{
          left: isAdded ? -SMART_SEARCH_SWIPE_REVEAL_WIDTH : 0,
          right: isAdded ? 0 : SMART_SEARCH_SWIPE_REVEAL_WIDTH,
        }}
        dragElastic={{ left: isAdded ? 0.18 : 0, right: isAdded ? 0 : 0.18 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        {isTrack ? (
          <SelectableArtwork
            ariaLabel={t("lobby.spotify.builder.toggleTrackSelection", {
              title: result.title,
            })}
            isSelected={isSelected}
            onToggle={onToggleSelection}
          >
            {result.imageUrl ? <SelectableArtworkImage src={result.imageUrl} /> : <SpotifyLogo />}
          </SelectableArtwork>
        ) : result.imageUrl ? (
          <img
            alt=""
            className={styles.spotifySmartResultImage}
            loading="lazy"
            src={result.imageUrl}
          />
        ) : (
          <span className={styles.spotifyPlaylistImageFallback}>
            <SpotifyLogo />
          </span>
        )}

        {isTrack ? (
          <span className={styles.spotifySmartResultMeta}>
            <strong>{result.title}</strong>
            <span>{result.subtitle}</span>
          </span>
        ) : (
          <button
            className={styles.spotifySmartResultOpenButton}
            onClick={onOpenPlaylist}
            type="button"
          >
            <span className={styles.spotifySmartResultMeta}>
              <strong>{result.title}</strong>
              <span>{result.subtitle}</span>
            </span>
          </button>
        )}

        <span className={styles.spotifySmartResultType}>
          {isTrack ? t("lobby.spotify.builder.trackType") : t("lobby.spotify.builder.playlistType")}
        </span>

        {isAdded ? (
          <span
            aria-label={t("lobby.spotify.builder.addedTrack")}
            className={styles.spotifySmartAddedMark}
            role="img"
            title={t("lobby.spotify.builder.addedTrack")}
          >
            <CheckIcon />
          </span>
        ) : null}
      </motion.div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={20} viewBox="0 0 24 24" width={20}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth={2.6} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={18} viewBox="0 0 24 24" width={18}>
      <path
        d="m20 6-11 11-5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.8}
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={20}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={20}
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={18} viewBox="0 0 24 24" width={18}>
      <path
        d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
      />
    </svg>
  );
}

function SpotifyQuickPicksPanel({ spotifyState }: { spotifyState: LobbySpotifyState }) {
  const { t } = useI18n();
  const { candidatePhase, candidateTracks, generateCandidatesFromPreset } = spotifyState;
  const [targetCountInput, setTargetCountInput] = useState("250");
  const isGenerating = candidatePhase === "generating";
  const hasGeneratedTracks = candidateTracks.length > 0;
  const targetCount = clampQuickPickTargetCount(targetCountInput);

  return (
    <div className={styles.spotifyDiscoveryPanel}>
      {!hasGeneratedTracks ? (
        <section className={styles.spotifyQuickPicksPanel}>
          <label className={styles.spotifyQuickPickLimitField}>
            <span>{t("lobby.spotify.quickPicks.limitLabel")}</span>
            <TextInput
              inputMode="numeric"
              max={SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT}
              min={10}
              onChange={(event) => setTargetCountInput(event.target.value)}
              type="number"
              value={targetCountInput}
            />
          </label>
          <div className={styles.spotifyQuickPickGrid}>
            {SPOTIFY_QUICK_PICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={styles.spotifyQuickPickCard}
                disabled={isGenerating}
                onClick={() => generateCandidatesFromPreset(preset.id, targetCount)}
                type="button"
              >
                <span className={styles.spotifyQuickPickTitle}>
                  {t(`lobby.spotify.quickPicks.${preset.id}.title`)}
                </span>
                <span className={styles.spotifyQuickPickDescription}>
                  {t(`lobby.spotify.quickPicks.${preset.id}.description`)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <SpotifyCandidateReviewPanel spotifyState={spotifyState} />
    </div>
  );
}

function clampQuickPickTargetCount(value: string): number {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) return 250;
  return Math.min(Math.max(parsedValue, 10), SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT);
}

interface SpotifyCandidateReviewPanelProps {
  backLabel?: string;
  onBack?: () => void;
  spotifyState: LobbySpotifyState;
}

function SpotifyCandidateReviewPanel({
  backLabel,
  onBack,
  spotifyState,
}: SpotifyCandidateReviewPanelProps) {
  const { t } = useI18n();
  const {
    candidateError,
    candidatePhase,
    candidateTracks,
    generatedPlaylistMessage,
    removeCandidateTrack,
    updateCandidateTrack,
    useGeneratedCandidates,
  } = spotifyState;
  const { showToast } = useAppToast();
  const isApplying = candidatePhase === "applying";
  const hasGeneratedTracks = candidateTracks.length > 0;
  const [selectedCandidateTrackIds, setSelectedCandidateTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeCandidateTrackId, setActiveCandidateTrackId] = useState<string | null>(null);
  const activeCandidateTrack =
    candidateTracks.find((track) => track.id === activeCandidateTrackId) ?? null;

  useEffect(() => {
    if (!generatedPlaylistMessage) return;
    showToast({
      id: "spotify-generated-playlist",
      message: generatedPlaylistMessage,
      type: "success",
    });
  }, [generatedPlaylistMessage, showToast]);

  useEffect(() => {
    setSelectedCandidateTrackIds((prev) => {
      if (prev.size === 0) return prev;
      const availableIds = new Set(candidateTracks.map((track) => track.id));
      const next = new Set([...prev].filter((trackId) => availableIds.has(trackId)));
      return next.size === prev.size ? prev : next;
    });
    setActiveCandidateTrackId((trackId) =>
      trackId && candidateTracks.some((track) => track.id === trackId) ? trackId : null,
    );
  }, [candidateTracks]);

  function toggleCandidateTrackSelection(trackId: string) {
    setSelectedCandidateTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function removeSelectedCandidateTracks() {
    if (selectedCandidateTrackIds.size === 0) return;
    selectedCandidateTrackIds.forEach((trackId) => removeCandidateTrack(trackId));
    setSelectedCandidateTrackIds(new Set());
  }

  return (
    <>
      {candidatePhase === "error" && candidateError ? (
        <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
          {candidateError}
        </p>
      ) : null}

      {hasGeneratedTracks ? (
        <section className={styles.spotifyCandidateReview}>
          <div className={styles.spotifyReviewHeader}>
            <span>{t("lobby.spotify.review.readyCount", { count: candidateTracks.length })}</span>
            {onBack && backLabel ? (
              <button className={styles.spotifyReviewBackBtn} onClick={onBack} type="button">
                {backLabel}
              </button>
            ) : null}
          </div>

          <PlaylistTrackList
            onOpenTrack={(track) => setActiveCandidateTrackId(track.id)}
            onRemoveTrack={removeCandidateTrack}
            onToggleSelection={toggleCandidateTrackSelection}
            selectedIds={selectedCandidateTrackIds}
            tracks={candidateTracks}
          />

          {selectedCandidateTrackIds.size > 0 ? (
            <div className={styles.spotifyBatchToolbar}>
              <span className={styles.spotifyBatchCount}>
                {t("lobby.playlist.selected", { count: selectedCandidateTrackIds.size })}
              </span>
              <ActionButton
                className={styles.spotifyBatchDeleteBtn}
                onClick={removeSelectedCandidateTracks}
                type="button"
                variant="danger"
              >
                {t("lobby.playlist.remove", { count: selectedCandidateTrackIds.size })}
              </ActionButton>
            </div>
          ) : null}

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.spotifyFloatingAction}
            initial={{ opacity: 0, y: 18 }}
            transition={createStandardTransition(false)}
          >
            <ActionButton
              className={styles.spotifyFloatingActionBtn}
              disabled={candidateTracks.length < 10 || isApplying}
              onClick={useGeneratedCandidates}
              type="button"
              variant="primary"
            >
              {isApplying
                ? t("lobby.spotify.review.applying")
                : t("lobby.spotify.review.useTracks")}
            </ActionButton>
          </motion.div>

          <PlaylistTrackDetailsSheet
            onClose={() => setActiveCandidateTrackId(null)}
            onSave={updateCandidateTrack}
            presentation="fullscreen"
            track={activeCandidateTrack}
          />
        </section>
      ) : null}
    </>
  );
}

interface SpotifyOpenedPlaylistPanelProps {
  onAddAll: () => void;
  onAddSelected: (trackIds: ReadonlySet<string>) => void;
  onBack: () => void;
  onRemoveTrack: (trackId: string) => void;
  onReplace: () => void;
  onUpdateTrack: (
    trackId: string,
    patch: {
      title?: string;
      artist?: string;
      albumTitle?: string;
      releaseYear?: number;
      metadataStatus?: "imported" | "edited" | "verified";
    },
  ) => void;
  phase: "idle" | "loading" | "ready" | "applying" | "error";
  playlist: LobbySpotifyState["openedPlaylist"];
  playlistError: string | null;
}

function SpotifyOpenedPlaylistPanel({
  onAddAll,
  onAddSelected,
  onBack,
  onRemoveTrack,
  onReplace,
  onUpdateTrack,
  phase,
  playlist,
  playlistError,
}: SpotifyOpenedPlaylistPanelProps) {
  const { t } = useI18n();
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(() => new Set());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const tracks = playlist?.tracks ?? [];
  const isApplying = phase === "applying";
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null;

  useEffect(() => {
    setSelectedTrackIds((prev) => {
      if (prev.size === 0) return prev;
      const availableIds = new Set(tracks.map((track) => track.id));
      const next = new Set([...prev].filter((trackId) => availableIds.has(trackId)));
      return next.size === prev.size ? prev : next;
    });
    setActiveTrackId((trackId) =>
      trackId && tracks.some((track) => track.id === trackId) ? trackId : null,
    );
  }, [tracks]);

  function toggleTrackSelection(trackId: string) {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function handleAddSelected() {
    onAddSelected(selectedTrackIds);
    setSelectedTrackIds(new Set());
  }

  if (phase === "loading") {
    return (
      <section className={styles.spotifyOpenedPlaylistPanel}>
        <button className={styles.spotifyReviewBackBtn} onClick={onBack} type="button">
          {t("lobby.spotify.builder.backToSearch")}
        </button>
        <div className={styles.spotifyLoadingState}>
          {t("lobby.spotify.builder.openingPlaylist")}
        </div>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className={styles.spotifyOpenedPlaylistPanel}>
        <button className={styles.spotifyReviewBackBtn} onClick={onBack} type="button">
          {t("lobby.spotify.builder.backToSearch")}
        </button>
        <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
          {playlistError ?? t("lobby.spotify.builder.openPlaylistFailed")}
        </p>
      </section>
    );
  }

  if (!playlist) return null;

  return (
    <section className={styles.spotifyOpenedPlaylistPanel}>
      <div className={styles.spotifyOpenedPlaylistHeader}>
        {playlist.imageUrl ? (
          <img alt="" className={styles.spotifyOpenedPlaylistImage} src={playlist.imageUrl} />
        ) : (
          <span className={styles.spotifyPlaylistImageFallback}>
            <SpotifyLogo />
          </span>
        )}
        <span className={styles.spotifyOpenedPlaylistMeta}>
          <strong>{playlist.title}</strong>
          <span>{playlist.subtitle}</span>
          {playlist.filteredCount > 0 ? (
            <span>
              {t("lobby.spotify.builder.filteredTracks", { count: playlist.filteredCount })}
            </span>
          ) : null}
        </span>
        <button className={styles.spotifyReviewBackBtn} onClick={onBack} type="button">
          {t("lobby.spotify.builder.backToSearch")}
        </button>
      </div>

      {tracks.length > 0 ? (
        <PlaylistTrackList
          onOpenTrack={(track) => setActiveTrackId(track.id)}
          onRemoveTrack={onRemoveTrack}
          onToggleSelection={toggleTrackSelection}
          selectedIds={selectedTrackIds}
          tracks={tracks}
        />
      ) : (
        <p className={styles.spotifyEmptyState}>{t("lobby.spotify.builder.playlistNoTracks")}</p>
      )}

      <div className={styles.spotifyOpenedPlaylistActions}>
        <ActionButton
          disabled={selectedTrackIds.size === 0 || isApplying}
          onClick={handleAddSelected}
          type="button"
          variant="neutral"
        >
          {t("lobby.spotify.builder.addSelected", { count: selectedTrackIds.size })}
        </ActionButton>
        <ActionButton
          disabled={tracks.length === 0 || isApplying}
          onClick={onAddAll}
          type="button"
          variant="neutral"
        >
          {t("lobby.spotify.builder.addAll")}
        </ActionButton>
        <ActionButton
          disabled={tracks.length === 0 || isApplying}
          onClick={onReplace}
          type="button"
          variant="neutral"
        >
          {t("lobby.spotify.builder.replaceQueue")}
        </ActionButton>
      </div>

      <PlaylistTrackDetailsSheet
        onClose={() => setActiveTrackId(null)}
        onSave={onUpdateTrack}
        presentation="fullscreen"
        track={activeTrack}
      />
    </section>
  );
}

interface SpotifySetupContentProps {
  currentSettings: PublicRoomSettings;
  spotifyState: LobbySpotifyState;
}

function SpotifySetupContent({ currentSettings, spotifyState }: SpotifySetupContentProps) {
  const { t } = useI18n();
  const {
    authError,
    authPhase,
    cancelRenamePlaylist,
    cancelSavePlaylist,
    clearCurrentPlaylist,
    confirmRenamePlaylist,
    confirmSavePlaylist,
    connectSpotify,
    importError,
    importPhase,
    importPlaylist,
    importPlaylistSearchResult,
    isOverwritePromptActive,
    isSavingWithName,
    loadedSavedPlaylistId,
    openEditModal,
    playlistUrl,
    playlistSearchError,
    playlistSearchPhase,
    playlistSearchResults,
    renameError,
    renameInputValue,
    renamingPlaylistId,
    saveNameError,
    saveName,
    savedPlaylistMessage,
    savedPlaylists,
    selectedSavedPlaylistId,
    confirmOverwrite,
    deleteSelectedSavedPlaylist,
    saveCurrentPlaylist,
    searchSpotifyPlaylists,
    setRenameInputValue,
    setSaveName,
    setSelectedSavedPlaylistId,
    setPlaylistSearchQuery,
    setPlaylistUrl,
    startRenamePlaylist,
    switchToSaveAsNew,
  } = spotifyState;

  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const isConnecting = authPhase === "connecting";
  const isImporting = importPhase === "importing";
  const isPlaylistSearching = playlistSearchPhase === "searching";
  const playlistImportAction = getPlaylistImportAction(playlistUrl);

  const savedPlaylistOptions = [
    { label: t("lobby.spotify.savedPlaylistSelectPlaceholder"), value: "" },
    ...savedPlaylists.map((playlist) => ({ label: playlist.name, value: playlist.id })),
  ];

  return (
    <div className={styles.spotifySetupContent}>
      {!isConnected ? (
        <div className={styles.spotifyConnectRow}>
          <div className={styles.spotifyConnectUnconnected}>
            <p className={styles.spotifyConnectHint}>
              {isConnecting
                ? t("lobby.spotify.connectingHint")
                : t("lobby.spotify.unconnectedHint")}
            </p>
            <ActionButton
              className={styles.spotifyConnectBtn}
              disabled={isConnecting}
              onClick={connectSpotify}
              type="button"
              variant="neutral"
            >
              <SpotifyLogo />
              {isConnecting ? t("lobby.spotify.connecting") : t("lobby.spotify.connect")}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {authPhase === "error" && authError ? (
        <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>{authError}</p>
      ) : null}

      {isConnected ? (
        <div className={styles.spotifyImportContent}>
          <div className={styles.spotifyPlaylistEditorEntry}>
            <span className={styles.spotifyPlaylistEditorSummary}>
              {isImported && importPhase !== "error"
                ? t("lobby.spotify.tracksQueued", {
                    count: currentSettings.importedTrackCount,
                  })
                : t("lobby.spotify.tracksQueuedEmpty")}
            </span>
            <div className={styles.spotifyPlaylistEditorActions}>
              <ActionButton
                className={styles.spotifyPlaylistEditorBtn}
                disabled={!isImported || isImporting}
                onClick={openEditModal}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.editPlaylist")}
              </ActionButton>
              <ActionButton
                className={styles.spotifyPlaylistEditorBtn}
                disabled={!isImported || isImporting}
                onClick={saveCurrentPlaylist}
                type="button"
                variant="neutral"
              >
                {t("lobby.spotify.savePlaylist")}
              </ActionButton>
              <ActionButton
                className={`${styles.spotifyPlaylistEditorBtn} ${styles.spotifyPlaylistClearBtn}`}
                disabled={!isImported || isImporting}
                onClick={clearCurrentPlaylist}
                type="button"
                variant="danger"
              >
                {t("lobby.spotify.clearPlaylist")}
              </ActionButton>
            </div>
          </div>

          {isImported && importPhase !== "error" ? (
            <div className={styles.spotifySongsReady}>
              <span className={styles.spotifySongsReadyDot} />
              <span>
                {t("lobby.spotify.tracksQueued", {
                  count: currentSettings.importedTrackCount,
                })}
              </span>
            </div>
          ) : null}

          <div className={styles.spotifyImportRow}>
            <TextInput
              disabled={isImporting || isPlaylistSearching}
              onChange={(e) => {
                setPlaylistUrl(e.target.value);
                setPlaylistSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (playlistImportAction === "import") importPlaylist();
                else searchSpotifyPlaylists();
              }}
              placeholder={t("lobby.spotify.playlistPlaceholder")}
              type="search"
              value={playlistUrl}
            />
            <ActionButton
              className={styles.spotifyImportBtn}
              disabled={!playlistUrl.trim() || isImporting || isPlaylistSearching}
              onClick={playlistImportAction === "import" ? importPlaylist : searchSpotifyPlaylists}
              type="button"
              variant="neutral"
            >
              {isImporting || isPlaylistSearching
                ? t("lobby.spotify.loading")
                : playlistImportAction === "import"
                  ? isImported
                    ? t("lobby.spotify.reload")
                    : t("lobby.spotify.import")
                  : t("lobby.spotify.searchPlaylists")}
            </ActionButton>
          </div>

          {playlistSearchPhase === "error" && playlistSearchError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {playlistSearchError}
            </p>
          ) : null}

          {playlistSearchResults.length > 0 ? (
            <div className={styles.spotifyImportSearchResults}>
              {playlistSearchResults.map((playlist) => (
                <SpotifyImportPlaylistResultRow
                  key={playlist.id}
                  onImport={() => importPlaylistSearchResult(playlist)}
                  playlist={playlist}
                />
              ))}
            </div>
          ) : null}

          {importPhase === "error" && importError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {importError}
            </p>
          ) : null}

          {isImported && importPhase !== "error" && !isImporting ? (
            isOverwritePromptActive ? (
              <div className={styles.savedPlaylistOverwriteRow}>
                <p className={styles.savedPlaylistOverwriteHint}>
                  {t("lobby.spotify.overwriteHint", {
                    name: savedPlaylists.find((p) => p.id === loadedSavedPlaylistId)?.name ?? "",
                  })}
                </p>
                <div className={styles.savedPlaylistOverwriteActions}>
                  <ActionButton
                    className={styles.spotifyEditBtn}
                    onClick={confirmOverwrite}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.overwritePlaylist")}
                  </ActionButton>
                  <ActionButton
                    className={styles.spotifyEditBtn}
                    onClick={switchToSaveAsNew}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.saveAsNew")}
                  </ActionButton>
                  <ActionButton
                    className={styles.spotifyEditBtn}
                    onClick={cancelSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
              </div>
            ) : isSavingWithName ? (
              <div className={styles.savedPlaylistNameGroup}>
                <div className={styles.savedPlaylistNameRow}>
                  <TextInput
                    autoFocus
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmSavePlaylist();
                      if (e.key === "Escape") cancelSavePlaylist();
                    }}
                    placeholder={t("lobby.spotify.savePlaylistNameLabel")}
                    value={saveName}
                  />
                  <ActionButton
                    className={styles.savedPlaylistNameConfirm}
                    onClick={confirmSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("lobby.spotify.confirmSave")}
                  </ActionButton>
                  <ActionButton
                    className={styles.savedPlaylistNameCancel}
                    onClick={cancelSavePlaylist}
                    type="button"
                    variant="neutral"
                  >
                    {t("common.cancel")}
                  </ActionButton>
                </div>
                {saveNameError ? (
                  <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
                    {saveNameError}
                  </p>
                ) : null}
              </div>
            ) : null
          ) : null}

          {savedPlaylists.length > 0 ? (
            <div className={styles.savedPlaylistPanel}>
              <div className={styles.savedPlaylistField}>
                <span className={styles.savedPlaylistLabel}>
                  {t("lobby.spotify.savedPlaylistSelectLabel")}
                </span>
                <AdaptiveSelect
                  label={t("lobby.spotify.savedPlaylistSelectLabel")}
                  onChange={(value) => setSelectedSavedPlaylistId(value)}
                  options={savedPlaylistOptions}
                  value={selectedSavedPlaylistId}
                />
              </div>

              {selectedSavedPlaylistId ? (
                renamingPlaylistId === selectedSavedPlaylistId ? (
                  <div className={styles.savedPlaylistNameGroup}>
                    <div className={styles.savedPlaylistNameRow}>
                      <TextInput
                        autoFocus
                        onChange={(e) => setRenameInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRenamePlaylist();
                          if (e.key === "Escape") cancelRenamePlaylist();
                        }}
                        placeholder={t("lobby.spotify.renamePlaylistLabel")}
                        value={renameInputValue}
                      />
                      <ActionButton
                        className={styles.savedPlaylistNameConfirm}
                        onClick={confirmRenamePlaylist}
                        type="button"
                        variant="neutral"
                      >
                        {t("lobby.spotify.confirmRename")}
                      </ActionButton>
                      <ActionButton
                        className={styles.savedPlaylistNameCancel}
                        onClick={cancelRenamePlaylist}
                        type="button"
                        variant="neutral"
                      >
                        {t("common.cancel")}
                      </ActionButton>
                    </div>
                    {renameError ? (
                      <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
                        {renameError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.savedPlaylistActions}>
                    <ActionButton
                      onClick={() => startRenamePlaylist(selectedSavedPlaylistId)}
                      type="button"
                      variant="neutral"
                    >
                      {t("lobby.spotify.renamePlaylist")}
                    </ActionButton>
                    <ActionButton
                      onClick={deleteSelectedSavedPlaylist}
                      type="button"
                      variant="danger"
                    >
                      {t("lobby.spotify.deleteSavedPlaylist")}
                    </ActionButton>
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          {savedPlaylistMessage ? (
            <p className={styles.spotifyStatusLine}>{savedPlaylistMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PlaylistImportAction = "import" | "search";

function getPlaylistImportAction(value: string): PlaylistImportAction {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "search";
  if (/^spotify:playlist:/i.test(trimmedValue)) return "import";
  if (/open\.spotify\.com\/playlist\//i.test(trimmedValue)) return "import";
  if (/^[a-zA-Z0-9]{22}$/.test(trimmedValue)) return "import";
  return "search";
}

interface SpotifyImportPlaylistResultRowProps {
  onImport: () => void;
  playlist: SpotifyPlaylistSearchItem;
}

function SpotifyImportPlaylistResultRow({
  onImport,
  playlist,
}: SpotifyImportPlaylistResultRowProps) {
  return (
    <button className={styles.spotifyImportSearchResultRow} onClick={onImport} type="button">
      {playlist.imageUrl ? (
        <img
          alt=""
          className={styles.spotifySmartResultImage}
          loading="lazy"
          src={playlist.imageUrl}
        />
      ) : (
        <span className={styles.spotifyPlaylistImageFallback}>
          <SpotifyLogo />
        </span>
      )}
      <span className={styles.spotifyPlaylistMeta}>
        <strong>{playlist.name}</strong>
        <span>
          {playlist.ownerName} · {playlist.trackCount} tracks
        </span>
      </span>
    </button>
  );
}
