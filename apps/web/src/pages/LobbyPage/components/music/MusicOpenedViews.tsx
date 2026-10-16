import { lazy, Suspense } from "react";
import { useI18n } from "../../../../features/i18n";
import { IconButton, ListSkeleton, type SheetHeader } from "../../../../features/ui/primitives";
import type { OpenedPlaylistActions } from "../../hooks/music/useOpenedPlaylistActions";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";
import { PlusIcon, ReplaceIcon, SpotifyLogo } from "../spotify/spotifySetupIcons";
import panelsStyles from "../spotify/spotifyPanels.module.css";
import discoveryStyles from "../spotify/spotifyDiscovery.module.css";

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

/**
 * The sheet's bar while a list is open: Back to the tabs, where the list came from, its name
 * and its actions, so the list needs no second header under the bar (owner, 2026-10-16).
 */
export function useOpenedViewHeader(
  spotify: UseLobbySpotifyResult,
  actions: OpenedPlaylistActions,
): SheetHeader {
  const { t } = useI18n();
  const { openedPlaylist } = spotify;

  if (openedPlaylist.openedPlaylistPhase === "idle") {
    return {
      backLabel: t("common.back"),
      eyebrow: t("music.tab.picks"),
      meta: t("lobby.spotify.review.readyCount", {
        count: spotify.candidates.candidateTracks.length,
      }),
      onBack: spotify.candidates.discardGeneratedCandidates,
      title: t("music.quickPicks.resultTitle"),
    };
  }

  const back = {
    backLabel: t("lobby.spotify.builder.backToSearch"),
    eyebrow: t("music.tab.find"),
    onBack: openedPlaylist.closeOpenedPlaylist,
  };
  const playlist = openedPlaylist.openedPlaylist;
  if (openedPlaylist.openedPlaylistPhase === "loading" || !playlist) {
    return { ...back, title: t("lobby.spotify.builder.openingPlaylist") };
  }
  if (openedPlaylist.openedPlaylistPhase === "error") {
    return { ...back, title: t("lobby.spotify.builder.openPlaylistFailed") };
  }

  const isBusy = playlist.tracks.length === 0 || openedPlaylist.openedPlaylistPhase === "applying";
  return {
    ...back,
    leading: playlist.imageUrl ? (
      <img alt="" className={panelsStyles.spotifyOpenedPlaylistImage} src={playlist.imageUrl} />
    ) : (
      <span className={discoveryStyles.spotifyPlaylistImageFallback}>
        <SpotifyLogo />
      </span>
    ),
    meta:
      playlist.filteredCount > 0
        ? `${playlist.subtitle} · ${t("lobby.spotify.builder.filteredTracks", { count: playlist.filteredCount })}`
        : playlist.subtitle,
    title: playlist.title,
    trailing: (
      <>
        <IconButton
          aria-label={t("lobby.spotify.builder.addAll")}
          disabled={isBusy}
          onClick={actions.addAll}
          title={t("lobby.spotify.builder.addAll")}
        >
          <PlusIcon />
        </IconButton>
        <IconButton
          aria-label={t("lobby.spotify.builder.replaceQueue")}
          disabled={isBusy}
          onClick={actions.replace}
          title={t("lobby.spotify.builder.replaceQueue")}
        >
          <ReplaceIcon />
        </IconButton>
      </>
    ),
  };
}

interface MusicOpenedViewsProps {
  actions: OpenedPlaylistActions;
  currentQueueCount: number;
  spotify: UseLobbySpotifyResult;
}

/**
 * The songs of what Find opened, in place of the tabs until Back. Plan `22` S8 replaces both
 * views with the one Playlist view.
 */
export function MusicOpenedViews({ actions, currentQueueCount, spotify }: MusicOpenedViewsProps) {
  const { openedPlaylist } = spotify;

  return (
    <Suspense fallback={<ListSkeleton count={3} leading="cover-sm" />}>
      {openedPlaylist.openedPlaylistPhase !== "idle" ? (
        <SpotifyOpenedPlaylistPanel
          onAddSelected={actions.addSelected}
          onRemoveSelected={actions.removeSelected}
          onUpdateTrack={openedPlaylist.updateOpenedPlaylistTrack}
          phase={openedPlaylist.openedPlaylistPhase}
          playlist={openedPlaylist.openedPlaylist}
          playlistError={openedPlaylist.openedPlaylistError}
          queuedSpotifyTrackIds={spotify.smartSearch.smartSearchQueuedTrackIds}
          queuedTrackIds={openedPlaylist.queuedTrackIds}
        />
      ) : (
        <SpotifyCandidateReviewPanel currentQueueCount={currentQueueCount} spotifyState={spotify} />
      )}
    </Suspense>
  );
}
