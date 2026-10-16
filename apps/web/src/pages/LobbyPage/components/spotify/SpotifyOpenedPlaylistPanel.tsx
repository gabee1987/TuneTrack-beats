import { useEffect, useState } from "react";
import { useI18n } from "../../../../features/i18n";
import { ListSkeleton, SelectionActionBar } from "../../../../features/ui/primitives";
import { getAddRemoveActions } from "../music/addRemoveActions";
import { PlaylistTrackDetailsSheet } from "../PlaylistTrackDetailsSheet";
import { SpotifyOpenedTrackRow } from "./SpotifyOpenedTrackRow";
import type { OpenedSpotifyPlaylist } from "../../hooks/spotify/lobbySpotify.types";
import panelsStyles from "./spotifyPanels.module.css";
import sharedStyles from "./spotifyShared.module.css";
import discoveryStyles from "./spotifyDiscovery.module.css";

/** The opened list's songs; its name, Back, Add all and Replace sit in the sheet's bar. */
interface SpotifyOpenedPlaylistPanelProps {
  onAddSelected: (trackIds: ReadonlySet<string>) => void;
  onRemoveSelected: (trackIds: ReadonlySet<string>) => void;
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
  onAddSelected,
  onRemoveSelected,
  onUpdateTrack,
  phase,
  playlist,
  playlistError,
  queuedSpotifyTrackIds,
  queuedTrackIds,
}: SpotifyOpenedPlaylistPanelProps) {
  const { t } = useI18n();
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
    return <ListSkeleton count={3} leading="cover-sm" trailing="action" />;
  }

  if (phase === "error") {
    return playlistError ? (
      <p className={`${sharedStyles.spotifyStatusLine} ${sharedStyles.spotifyStatusError}`}>
        {playlistError}
      </p>
    ) : null;
  }

  if (!playlist) return null;

  return (
    <section className={panelsStyles.spotifyOpenedPlaylistPanel}>
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

      <div className={panelsStyles.spotifySelectionDock}>
        <SelectionActionBar
          actions={getAddRemoveActions(
            {
              addCount: selectedUnqueuedTracks.length,
              disabled: isApplying,
              onAdd: handleAddSelected,
              onRemove: handleRemoveSelected,
              removeCount: selectedQueuedTracks.length,
            },
            t,
          )}
          count={selectedTrackIds.size}
        />
      </div>

      <PlaylistTrackDetailsSheet
        onClose={() => setActiveTrackId(null)}
        onSave={onUpdateTrack}
        track={activeTrack}
      />
    </section>
  );
}
