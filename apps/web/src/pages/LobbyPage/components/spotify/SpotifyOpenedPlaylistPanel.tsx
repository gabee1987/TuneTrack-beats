import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { createStandardTransition, useReducedMotionPreference } from "../../../../features/motion";
import { useI18n } from "../../../../features/i18n";
import { ActionButton } from "../../../../features/ui/ActionButton";
import { PlaylistTrackDetailsSheet } from "../PlaylistTrackDetailsSheet";
import { BackIcon, PlusIcon, ReplaceIcon, SpotifyLogo } from "./spotifySetupIcons";
import { SpotifyOpenedTrackRow } from "./SpotifyOpenedTrackRow";
import type { OpenedSpotifyPlaylist } from "../../hooks/spotify/lobbySpotify.types";
import panelsStyles from "./spotifyPanels.module.css";
import sharedStyles from "./spotifyShared.module.css";
import discoveryStyles from "./spotifyDiscovery.module.css";

interface SpotifyOpenedPlaylistPanelProps {
  onAddAll: () => void;
  onAddSelected: (trackIds: ReadonlySet<string>) => void;
  onBack: () => void;
  onRemoveSelected: (trackIds: ReadonlySet<string>) => void;
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
  playlist: OpenedSpotifyPlaylist | null;
  playlistError: string | null;
  queuedSpotifyTrackIds: ReadonlySet<string>;
  queuedTrackIds: ReadonlySet<string>;
}

export function SpotifyOpenedPlaylistPanel({
  onAddAll,
  onAddSelected,
  onBack,
  onRemoveSelected,
  onReplace,
  onUpdateTrack,
  phase,
  playlist,
  playlistError,
  queuedSpotifyTrackIds,
  queuedTrackIds,
}: SpotifyOpenedPlaylistPanelProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(() => new Set());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const tracks = playlist?.tracks ?? [];
  const isApplying = phase === "applying";
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const selectedTracks = tracks.filter((track) => selectedTrackIds.has(track.id));
  const selectedUnqueuedTracks = selectedTracks.filter((track) => !isTrackQueued(track.id));
  const selectedQueuedTracks = selectedTracks.filter((track) => isTrackQueued(track.id));

  function isTrackQueued(trackId: string) {
    return queuedTrackIds.has(trackId) || queuedSpotifyTrackIds.has(trackId);
  }

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
    onAddSelected(new Set(selectedUnqueuedTracks.map((track) => track.id)));
    setSelectedTrackIds(new Set());
  }

  function handleRemoveSelected() {
    onRemoveSelected(new Set(selectedQueuedTracks.map((track) => track.id)));
    setSelectedTrackIds(new Set());
  }

  function handleAddTrack(trackId: string) {
    onAddSelected(new Set([trackId]));
  }

  function handleRemoveTrackFromQueue(trackId: string) {
    onRemoveSelected(new Set([trackId]));
  }

  if (phase === "loading") {
    return (
      <section className={panelsStyles.spotifyOpenedPlaylistPanel}>
        <button className={panelsStyles.spotifyReviewBackBtn} onClick={onBack} type="button">
          {t("lobby.spotify.builder.backToSearch")}
        </button>
        <div className={panelsStyles.spotifyLoadingState}>
          {t("lobby.spotify.builder.openingPlaylist")}
        </div>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className={panelsStyles.spotifyOpenedPlaylistPanel}>
        <button className={panelsStyles.spotifyReviewBackBtn} onClick={onBack} type="button">
          {t("lobby.spotify.builder.backToSearch")}
        </button>
        <p className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}>
          {playlistError ?? t("lobby.spotify.builder.openPlaylistFailed")}
        </p>
      </section>
    );
  }

  if (!playlist) return null;

  return (
    <section className={panelsStyles.spotifyOpenedPlaylistPanel}>
      <div className={panelsStyles.spotifyOpenedPlaylistHeader}>
        <button
          aria-label={t("lobby.spotify.builder.backToSearch")}
          className={panelsStyles.spotifyOpenedPlaylistIconBtn}
          onClick={onBack}
          type="button"
        >
          <BackIcon />
        </button>
        {playlist.imageUrl ? (
          <img alt="" className={panelsStyles.spotifyOpenedPlaylistImage} src={playlist.imageUrl} />
        ) : (
          <span className={discoveryStyles.spotifyPlaylistImageFallback}>
            <SpotifyLogo />
          </span>
        )}
        <span className={panelsStyles.spotifyOpenedPlaylistMeta}>
          <strong>{playlist.title}</strong>
          <span>{playlist.subtitle}</span>
          {playlist.filteredCount > 0 ? (
            <span>
              {t("lobby.spotify.builder.filteredTracks", { count: playlist.filteredCount })}
            </span>
          ) : null}
        </span>
        <div className={panelsStyles.spotifyOpenedPlaylistHeaderActions}>
          <button
            aria-label={t("lobby.spotify.builder.addAll")}
            className={panelsStyles.spotifyOpenedPlaylistIconBtn}
            disabled={tracks.length === 0 || isApplying}
            onClick={onAddAll}
            title={t("lobby.spotify.builder.addAll")}
            type="button"
          >
            <PlusIcon />
          </button>
          <button
            aria-label={t("lobby.spotify.builder.replaceQueue")}
            className={panelsStyles.spotifyOpenedPlaylistIconBtn}
            disabled={tracks.length === 0 || isApplying}
            onClick={onReplace}
            title={t("lobby.spotify.builder.replaceQueue")}
            type="button"
          >
            <ReplaceIcon />
          </button>
        </div>
      </div>

      {tracks.length > 0 ? (
        <div
          className={`${panelsStyles.spotifyOpenedTrackList} ${
            selectedTrackIds.size > 0 ? discoveryStyles.spotifySmartResultListWithAction : ""
          }`}
        >
          {tracks.map((track) => (
            <SpotifyOpenedTrackRow
              isAdded={isTrackQueued(track.id)}
              isSelected={selectedTrackIds.has(track.id)}
              key={track.id}
              onAdd={() => handleAddTrack(track.id)}
              onOpen={() => setActiveTrackId(track.id)}
              onRemoveFromQueue={() => handleRemoveTrackFromQueue(track.id)}
              onToggleSelection={() => toggleTrackSelection(track.id)}
              track={track}
            />
          ))}
        </div>
      ) : (
        <p className={panelsStyles.spotifyEmptyState}>
          {t("lobby.spotify.builder.playlistNoTracks")}
        </p>
      )}

      {selectedTrackIds.size > 0 ? (
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className={discoveryStyles.spotifySearchSelectedAction}
          initial={{ opacity: 0, y: 18 }}
          transition={createStandardTransition(reduceMotion)}
        >
          {selectedUnqueuedTracks.length > 0 ? (
            <ActionButton
              className={discoveryStyles.spotifySearchAddSelectedBtn}
              disabled={isApplying}
              onClick={handleAddSelected}
              type="button"
              variant="neutral"
            >
              {t("lobby.spotify.builder.addSelected", {
                count: selectedUnqueuedTracks.length,
              })}
            </ActionButton>
          ) : null}
          {selectedQueuedTracks.length > 0 ? (
            <ActionButton
              className={`${discoveryStyles.spotifySearchAddSelectedBtn} ${discoveryStyles.spotifySearchRemoveSelectedBtn}`}
              disabled={isApplying}
              onClick={handleRemoveSelected}
              type="button"
              variant="danger"
            >
              {t("lobby.spotify.builder.removeSelected", {
                count: selectedQueuedTracks.length,
              })}
            </ActionButton>
          ) : null}
        </m.div>
      ) : null}

      <PlaylistTrackDetailsSheet
        onClose={() => setActiveTrackId(null)}
        onSave={onUpdateTrack}
        track={activeTrack}
      />
    </section>
  );
}
