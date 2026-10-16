import { MIN_PLAYLIST_TRACK_COUNT, type PlaylistQueueUpdateMode } from "@tunetrack/shared/client";
import { useEffect } from "react";
import { useI18n } from "../../../../features/i18n";
import { useAppToast } from "../../../../features/toast";
import type { UseLobbySpotifyResult } from "../spotify/lobbySpotify.types";
import {
  createSavedDeckSource,
  type PlaylistEditorFilter,
  type PlaylistEditorSource,
} from "./playlistEditorTarget";
import { useOpenedPlaylistActions } from "./useOpenedPlaylistActions";

/** Which list the Playlist view shows (`22` §4.9). */
export type PlaylistViewKind = "quickPick" | "room" | "saved" | "spotify";

/** A search list adds its songs to the game in place, and takes them out again. */
export interface PlaylistGameMembership {
  add: (trackIds: ReadonlySet<string>) => void;
  isInGame: (trackId: string) => boolean;
  remove: (trackIds: ReadonlySet<string>) => void;
}

/** Putting found songs in the game: with a deck there, the player adds them or replaces it. */
export interface PlaylistUse {
  apply: (mode: PlaylistQueueUpdateMode) => void;
  /** The songs the use takes: the selected ones, or the whole list. */
  songCount: number;
}

export interface PlaylistViewModel {
  /** Whether the whole list can go into the game (a quick pick needs enough songs). */
  canUseAll: boolean;
  coverUrl?: string | undefined;
  error: string | null;
  initialFilter: PlaylistEditorFilter;
  isBusy: boolean;
  kind: PlaylistViewKind;
  /** A different list starts over: filter, sort and selection. */
  listKey: string;
  membership: PlaylistGameMembership | null;
  name: string;
  onBack: () => void;
  /** Uses the list, or the selected songs; `null` on the room deck, which is in the game. */
  onUse: ((trackIds?: ReadonlySet<string>) => void) | null;
  source: PlaylistEditorSource;
  /** Where the songs came from, under the cover; the room deck needs no line. */
  sourceLabel: string | null;
}

interface PlaylistViewOptions {
  onUse: (use: PlaylistUse) => void;
  /** A saved deck goes in the game the way its Load button puts it there. */
  onUseSavedDeck: (deckId: string) => void;
  roomDeck: PlaylistEditorSource;
}

/**
 * The one list open over the Music sheet, if any: a deck from Your decks first, then what Find
 * opened, then a quick pick's songs. Every list is the same view; this says how each one differs.
 */
export function usePlaylistView(
  spotify: UseLobbySpotifyResult,
  { onUse, onUseSavedDeck, roomDeck }: PlaylistViewOptions,
): PlaylistViewModel | null {
  const { t } = useI18n();
  const { showToast } = useAppToast();
  const openedActions = useOpenedPlaylistActions(spotify);
  const { candidates, openedPlaylist, queue, savedPlaylists } = spotify;
  const { generatedPlaylistMessage } = savedPlaylists;

  useEffect(() => {
    if (!generatedPlaylistMessage) return;
    showToast({
      id: "spotify-generated-playlist",
      message: generatedPlaylistMessage,
      type: "success",
    });
  }, [generatedPlaylistMessage, showToast]);

  const { editor } = queue;
  if (editor?.deck === "room") {
    return {
      canUseAll: false,
      error: null,
      initialFilter: editor.filter,
      isBusy: false,
      kind: "room",
      listKey: "room",
      membership: null,
      name: t("music.decks.current"),
      onBack: queue.closeEditor,
      onUse: null,
      source: roomDeck,
      sourceLabel: null,
    };
  }

  if (editor?.deck === "saved") {
    const deck = savedPlaylists.savedPlaylists.find((saved) => saved.id === editor.deckId);
    const source = createSavedDeckSource(deck?.tracks ?? [], (tracks) => {
      if (deck) savedPlaylists.updateSavedDeckTracks(deck.id, tracks);
    });
    return {
      canUseAll: source.tracks.length > 0,
      coverUrl: deck?.imageUrl,
      error: null,
      initialFilter: editor.filter,
      isBusy: false,
      kind: "saved",
      listKey: `saved:${editor.deckId}`,
      membership: null,
      name: deck?.name ?? "",
      onBack: queue.closeEditor,
      onUse: () => onUseSavedDeck(editor.deckId),
      source,
      sourceLabel: t("music.view.source.saved"),
    };
  }

  if (openedPlaylist.openedPlaylistPhase !== "idle") {
    const playlist = openedPlaylist.openedPlaylist;
    const phase = openedPlaylist.openedPlaylistPhase;
    const tracks = playlist?.tracks ?? [];
    const queued = openedPlaylist.queuedTrackIds;
    const queuedFromSearch = spotify.smartSearch.smartSearchQueuedTrackIds;
    return {
      canUseAll: tracks.length > 0,
      coverUrl: playlist?.imageUrl,
      error:
        phase === "error"
          ? (openedPlaylist.openedPlaylistError ?? t("lobby.spotify.builder.openPlaylistFailed"))
          : null,
      initialFilter: "all",
      isBusy: phase === "applying",
      kind: "spotify",
      listKey: `spotify:${playlist?.id ?? phase}`,
      membership: {
        add: openedActions.addSelected,
        isInGame: (trackId) => queued.has(trackId) || queuedFromSearch.has(trackId),
        remove: openedActions.removeSelected,
      },
      name: playlist?.title ?? t("lobby.spotify.builder.openingPlaylist"),
      onBack: openedPlaylist.closeOpenedPlaylist,
      onUse: () =>
        onUse({
          apply: (mode) => (mode === "append" ? openedActions.addAll() : openedActions.replace()),
          songCount: tracks.length,
        }),
      source: {
        isLoading: phase === "loading",
        removeTracks: (trackIds) => trackIds.forEach(openedPlaylist.removeOpenedPlaylistTrack),
        tracks,
        updateTrack: openedPlaylist.updateOpenedPlaylistTrack,
      },
      sourceLabel: playlist ? getSpotifySourceLabel(playlist, t) : null,
    };
  }

  if (candidates.candidateTracks.length > 0) {
    const tracks = candidates.candidateTracks;
    return {
      canUseAll: tracks.length >= MIN_PLAYLIST_TRACK_COUNT,
      error: candidates.candidatePhase === "error" ? candidates.candidateError : null,
      initialFilter: "all",
      isBusy: candidates.candidatePhase === "applying",
      kind: "quickPick",
      listKey: `quickPick:${candidates.candidateSessionId ?? ""}`,
      membership: null,
      name: t("music.quickPicks.resultTitle"),
      onBack: candidates.discardGeneratedCandidates,
      onUse: (trackIds) =>
        onUse({
          apply: (mode) =>
            candidates.applyGeneratedCandidates(mode, trackIds ? [...trackIds] : undefined),
          songCount: trackIds?.size ?? tracks.length,
        }),
      source: {
        isLoading: false,
        removeTracks: (trackIds) => trackIds.forEach(candidates.removeCandidateTrack),
        tracks,
        updateTrack: candidates.updateCandidateTrack,
      },
      sourceLabel: t("music.view.source.quickPick"),
    };
  }

  return null;
}

function getSpotifySourceLabel(
  playlist: { filteredCount: number; subtitle: string },
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (playlist.filteredCount === 0) return playlist.subtitle;
  return `${playlist.subtitle} · ${t("lobby.spotify.builder.filteredTracks", { count: playlist.filteredCount })}`;
}
