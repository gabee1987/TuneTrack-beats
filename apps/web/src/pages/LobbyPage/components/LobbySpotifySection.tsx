import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  SPOTIFY_QUICK_PICK_PRESETS,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { createStandardTransition } from "../../../features/motion";
import { useI18n } from "../../../features/i18n";
import { ActionButton } from "../../../features/ui/ActionButton";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { SettingInfoButton } from "../../../features/ui/SettingField";
import { TextInput } from "../../../features/ui/TextInput";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { GamePageToastStack } from "../../GamePage/components/GamePageToastStack";
import type { GamePageToast } from "../../GamePage/gamePageToast.types";
import { LobbySectionHeader } from "./LobbySectionHeader";
import { PlaylistEditModal } from "./PlaylistEditModal";
import { PlaylistTrackDetailsSheet } from "./PlaylistTrackDetailsSheet";
import { PlaylistTrackList } from "./PlaylistTrackList";
import { SelectableArtwork, SelectableArtworkImage } from "./SelectableArtwork";
import { AdaptiveSelect } from "./AdaptiveSelect";
import { useLobbySpotify } from "../hooks/useLobbySpotify";
import lobbyStyles from "../LobbyPage.module.css";
import styles from "./LobbySpotifySection.module.css";

interface LobbySpotifySectionProps {
  currentSettings: PublicRoomSettings;
}

type LobbySpotifyState = ReturnType<typeof useLobbySpotify>;
type SpotifySetupSource = "playlistUrl" | "findPlaylists" | "filters" | "quickPicks";

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
  const {
    candidatePhase,
    candidateTracks,
    generateCandidatesFromSelectedPlaylists,
    playlistSearchError,
    playlistSearchPhase,
    playlistSearchQuery,
    playlistSearchResults,
    searchSpotifyPlaylists,
    selectedSpotifyPlaylistIds,
    setPlaylistSearchQuery,
    toggleSpotifyPlaylistSelection,
  } = spotifyState;

  const isSearching = playlistSearchPhase === "searching";
  const isGenerating = candidatePhase === "generating";
  const hasSelectedPlaylists = selectedSpotifyPlaylistIds.size > 0;
  const hasGeneratedTracks = candidateTracks.length > 0;

  return (
    <div className={styles.spotifyDiscoveryPanel}>
      {!hasGeneratedTracks ? (
        <section className={styles.spotifyDiscoverySearch}>
          <div className={styles.spotifyDiscoveryToolbar}>
            <div className={styles.spotifySearchRow}>
              <TextInput
                aria-label={t("lobby.spotify.find.title")}
                disabled={isSearching}
                onChange={(event) => setPlaylistSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") searchSpotifyPlaylists();
                }}
                placeholder={t("lobby.spotify.find.placeholder")}
                value={playlistSearchQuery}
              />
              <ActionButton
                className={styles.spotifySearchBtn}
                disabled={playlistSearchQuery.trim().length < 2 || isSearching}
                onClick={searchSpotifyPlaylists}
                type="button"
                variant="primary"
              >
                {isSearching ? t("lobby.spotify.find.searching") : t("lobby.spotify.find.search")}
              </ActionButton>
            </div>
          </div>

          {playlistSearchPhase === "error" && playlistSearchError ? (
            <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>
              {playlistSearchError}
            </p>
          ) : null}

          {playlistSearchResults.length > 0 ? (
            <div className={styles.spotifyPlaylistList}>
              {playlistSearchResults.map((playlist) => {
                const isSelected = selectedSpotifyPlaylistIds.has(playlist.id);
                return (
                  <div
                    key={playlist.id}
                    aria-pressed={isSelected}
                    className={`${styles.spotifyPlaylistRow} ${
                      isSelected ? styles.spotifyPlaylistRowSelected : ""
                    }`}
                    onClick={() => toggleSpotifyPlaylistSelection(playlist.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleSpotifyPlaylistSelection(playlist.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <SelectableArtwork
                      ariaLabel={t("lobby.spotify.find.toggleSelection", {
                        name: playlist.name,
                      })}
                      isSelected={isSelected}
                      onToggle={() => toggleSpotifyPlaylistSelection(playlist.id)}
                    >
                      {playlist.imageUrl ? (
                        <SelectableArtworkImage src={playlist.imageUrl} />
                      ) : (
                        <span className={styles.spotifyPlaylistImageFallback}>
                          <SpotifyLogo />
                        </span>
                      )}
                    </SelectableArtwork>
                    <span className={styles.spotifyPlaylistMeta}>
                      <strong>{playlist.name}</strong>
                      <span>
                        {playlist.ownerName} ·{" "}
                        {t("lobby.spotify.find.trackCount", { count: playlist.trackCount })}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : playlistSearchPhase === "idle" && playlistSearchQuery.trim().length >= 2 ? (
            <p className={styles.spotifyEmptyState}>{t("lobby.spotify.find.empty")}</p>
          ) : null}

          {hasSelectedPlaylists ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={styles.spotifyFloatingAction}
              initial={{ opacity: 0, y: 18 }}
              transition={createStandardTransition(false)}
            >
              <ActionButton
                className={styles.spotifyFloatingActionBtn}
                disabled={isGenerating}
                onClick={generateCandidatesFromSelectedPlaylists}
                type="button"
                variant="primary"
              >
                {isGenerating
                  ? t("lobby.spotify.find.generating")
                  : t("lobby.spotify.find.generate")}
              </ActionButton>
            </motion.div>
          ) : null}
        </section>
      ) : null}

      <SpotifyCandidateReviewPanel
        backLabel={t("lobby.spotify.quickPicks.back")}
        onBack={spotifyState.discardGeneratedCandidates}
        spotifyState={spotifyState}
      />
    </div>
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
  const isApplying = candidatePhase === "applying";
  const hasGeneratedTracks = candidateTracks.length > 0;
  const generatedPlaylistToasts: GamePageToast[] = generatedPlaylistMessage
    ? [{ id: "spotify-generated-playlist", type: "success", message: generatedPlaylistMessage }]
    : [];
  const [selectedCandidateTrackIds, setSelectedCandidateTrackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeCandidateTrackId, setActiveCandidateTrackId] = useState<string | null>(null);
  const activeCandidateTrack =
    candidateTracks.find((track) => track.id === activeCandidateTrackId) ?? null;

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

      <GamePageToastStack toasts={generatedPlaylistToasts} />
    </>
  );
}

interface SpotifySetupContentProps {
  currentSettings: PublicRoomSettings;
  spotifyState: LobbySpotifyState;
}

function SpotifySetupContent({ currentSettings, spotifyState }: SpotifySetupContentProps) {
  const { t } = useI18n();
  const {
    accountType,
    authError,
    authPhase,
    cancelRenamePlaylist,
    cancelSavePlaylist,
    confirmRenamePlaylist,
    confirmSavePlaylist,
    connectSpotify,
    importError,
    importPhase,
    importPlaylist,
    isOverwritePromptActive,
    isSavingWithName,
    loadedSavedPlaylistId,
    openEditModal,
    playlistUrl,
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
    setRenameInputValue,
    setSaveName,
    setSelectedSavedPlaylistId,
    setPlaylistUrl,
    startRenamePlaylist,
    switchToSaveAsNew,
  } = spotifyState;

  const isConnected = currentSettings.spotifyAuthStatus === "connected";
  const isImported = currentSettings.playlistImported;
  const resolvedAccountType = accountType ?? currentSettings.spotifyAccountType;
  const isConnecting = authPhase === "connecting";
  const isImporting = importPhase === "importing";

  const connectHint = isConnected
    ? resolvedAccountType === "premium"
      ? t("lobby.spotify.browserPlaybackHint")
      : t("lobby.spotify.previewPlaybackHint")
    : isConnecting
      ? t("lobby.spotify.connectingHint")
      : null;

  const savedPlaylistOptions = [
    { label: t("lobby.spotify.savedPlaylistSelectPlaceholder"), value: "" },
    ...savedPlaylists.map((playlist) => ({ label: playlist.name, value: playlist.id })),
  ];

  return (
    <div className={styles.spotifySetupContent}>
      <div className={styles.spotifyConnectRow}>
        {isConnected ? (
          <div className={styles.spotifyConnectedState}>
            <div className={styles.spotifyBadgeRow}>
              <span className={styles.spotifyConnectedBadge}>
                <span className={styles.spotifyConnectedDot} />
                {t("lobby.spotify.connected")}
              </span>
              {resolvedAccountType ? (
                <SpotifyAccountBadge accountType={resolvedAccountType} />
              ) : null}
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

            {connectHint ? <p className={styles.spotifyConnectHint}>{connectHint}</p> : null}
          </div>
        ) : (
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
        )}
      </div>

      {authPhase === "error" && authError ? (
        <p className={`${styles.spotifyStatusLine} ${styles.spotifyStatusError}`}>{authError}</p>
      ) : null}

      {isConnected ? (
        <div className={styles.spotifyImportContent}>
          {isImported && importPhase !== "error" ? (
            <div className={styles.spotifyPlaylistEditorEntry}>
              <span className={styles.spotifyPlaylistEditorSummary}>
                {t("lobby.spotify.tracksQueued", {
                  count: currentSettings.importedTrackCount,
                })}
              </span>
              <div className={styles.spotifyPlaylistEditorActions}>
                <ActionButton
                  className={styles.spotifyPlaylistEditorBtn}
                  disabled={isImporting}
                  onClick={openEditModal}
                  type="button"
                  variant="neutral"
                >
                  {t("lobby.spotify.editPlaylist")}
                </ActionButton>
                <ActionButton
                  className={styles.spotifyPlaylistEditorBtn}
                  disabled={isImporting}
                  onClick={saveCurrentPlaylist}
                  type="button"
                  variant="neutral"
                >
                  {t("lobby.spotify.savePlaylist")}
                </ActionButton>
              </div>
            </div>
          ) : null}

          <div className={styles.spotifyImportRow}>
            <TextInput
              disabled={isImporting}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder={t("lobby.spotify.playlistPlaceholder")}
              type="url"
              value={playlistUrl}
            />
            <ActionButton
              className={styles.spotifyImportBtn}
              disabled={!playlistUrl.trim() || isImporting}
              onClick={importPlaylist}
              type="button"
              variant="neutral"
            >
              {isImporting
                ? t("lobby.spotify.loading")
                : isImported
                  ? t("lobby.spotify.reload")
                  : t("lobby.spotify.import")}
            </ActionButton>
          </div>

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
