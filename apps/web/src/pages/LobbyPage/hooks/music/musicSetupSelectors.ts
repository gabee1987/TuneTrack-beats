import {
  countTracksToCheck,
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  type PublicRoomSettings,
} from "@tunetrack/shared/client";
import type { SavedPlaylist } from "../../../../services/savedPlaylists/savedPlaylists";
import type { LobbySpotifyAuthState } from "../spotify/lobbySpotify.types";

/** Your decks, Find (search and links) and Quick picks (ready-made decks). */
export type MusicTab = "decks" | "find" | "picks";

/** The Find type chips: the three music types and Spotify playlists. */
export type FindKind = "album" | "artist" | "playlist" | "track";

export type MusicPlaybackState = "connecting" | "error" | "free" | "none" | "premium";

export const QUICK_PICK_MIN_SONGS = 10;
export const QUICK_PICK_MAX_SONGS = SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT;

const MOSAIC_COVER_COUNT = 4;

export interface SavedDeckSummary {
  /** The Spotify playlist's own cover, or else its songs' covers as a mosaic. */
  coverUrls: string[];
  id: string;
  name: string;
  songCount: number;
  toCheckCount: number;
}

/** Your decks when there is one to pick from, otherwise Find (`22` §4.8). */
export function getDefaultMusicTab(savedDeckCount: number): MusicTab {
  return savedDeckCount > 0 ? "decks" : "find";
}

/** A pasted playlist link, URI or bare id imports at once; anything else is a search. */
export function isPlaylistLink(value: string): boolean {
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;
  if (/^spotify:playlist:/i.test(trimmedValue)) return true;
  if (/open\.spotify\.com\/playlist\//i.test(trimmedValue)) return true;
  return /^[a-zA-Z0-9]{22}$/.test(trimmedValue);
}

/** Up to four different song covers for a deck's mosaic. */
export function pickDeckCovers(tracks: readonly { artworkUrl?: string | undefined }[]): string[] {
  return [
    ...new Set(tracks.flatMap((track) => (track.artworkUrl ? [track.artworkUrl] : []))),
  ].slice(0, MOSAIC_COVER_COUNT);
}

export function summarizeSavedDeck(deck: SavedPlaylist): SavedDeckSummary {
  return {
    coverUrls: deck.imageUrl ? [deck.imageUrl] : pickDeckCovers(deck.tracks),
    id: deck.id,
    name: deck.name,
    songCount: deck.tracks.length,
    toCheckCount: countTracksToCheck(deck.tracks),
  };
}

/** The login in progress wins over the room's stored status, so the block answers the tap. */
export function getMusicPlaybackState(
  settings: Pick<PublicRoomSettings, "spotifyAccountType" | "spotifyAuthStatus">,
  auth: Pick<LobbySpotifyAuthState, "accountType" | "authPhase">,
): MusicPlaybackState {
  if (auth.authPhase === "connecting") return "connecting";
  if (auth.authPhase === "error") return "error";
  if (settings.spotifyAuthStatus !== "connected") return "none";
  return (auth.accountType ?? settings.spotifyAccountType) === "free" ? "free" : "premium";
}

export function clampQuickPickSongs(value: number): number {
  return Math.min(Math.max(Math.round(value), QUICK_PICK_MIN_SONGS), QUICK_PICK_MAX_SONGS);
}
