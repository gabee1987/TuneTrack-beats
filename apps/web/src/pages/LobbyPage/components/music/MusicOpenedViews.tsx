import { lazy, Suspense } from "react";
import { useI18n } from "../../../../features/i18n";
import { ListSkeleton } from "../../../../features/ui/primitives";
import { useOpenedPlaylistActions } from "../../hooks/music/useOpenedPlaylistActions";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";

const SpotifyOpenedPlaylistPanel = lazy(async () => {
  const module = await import("../spotify/SpotifyOpenedPlaylistPanel");
  return { default: module.SpotifyOpenedPlaylistPanel };
});

const SpotifyCandidateReviewPanel = lazy(async () => {
  const module = await import("../spotify/SpotifyCandidateReviewPanel");
  return { default: module.SpotifyCandidateReviewPanel };
});

/** An album, artist or playlist opened from Find, or quick-pick songs waiting for review. */
export function hasOpenedView(spotify: UseLobbySpotifyResult): boolean {
  return (
    spotify.openedPlaylist.openedPlaylistPhase !== "idle" ||
    spotify.candidates.candidateTracks.length > 0
  );
}

interface MusicOpenedViewsProps {
  currentQueueCount: number;
  spotify: UseLobbySpotifyResult;
}

/**
 * The songs of what Find opened, in place of the tabs until Back. Plan `22` S8 replaces both
 * views with the one Playlist view.
 */
export function MusicOpenedViews({ currentQueueCount, spotify }: MusicOpenedViewsProps) {
  const { t } = useI18n();
  const actions = useOpenedPlaylistActions(spotify);
  const { openedPlaylist } = spotify;

  return (
    <Suspense fallback={<ListSkeleton count={3} leading="cover-sm" />}>
      {openedPlaylist.openedPlaylistPhase !== "idle" ? (
        <SpotifyOpenedPlaylistPanel
          onAddAll={actions.addAll}
          onAddSelected={actions.addSelected}
          onBack={openedPlaylist.closeOpenedPlaylist}
          onRemoveSelected={actions.removeSelected}
          onReplace={actions.replace}
          onUpdateTrack={openedPlaylist.updateOpenedPlaylistTrack}
          phase={openedPlaylist.openedPlaylistPhase}
          playlist={openedPlaylist.openedPlaylist}
          playlistError={openedPlaylist.openedPlaylistError}
          queuedSpotifyTrackIds={spotify.smartSearch.smartSearchQueuedTrackIds}
          queuedTrackIds={openedPlaylist.queuedTrackIds}
        />
      ) : (
        <SpotifyCandidateReviewPanel
          backLabel={t("music.find.back")}
          currentQueueCount={currentQueueCount}
          onBack={spotify.candidates.discardGeneratedCandidates}
          spotifyState={spotify}
        />
      )}
    </Suspense>
  );
}
