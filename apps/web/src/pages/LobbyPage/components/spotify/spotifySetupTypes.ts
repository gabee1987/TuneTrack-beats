import type { SpotifySmartSearchTypeFilter } from "@tunetrack/shared";
import type { UseLobbySpotifyResult } from "../../hooks/spotify/lobbySpotify.types";

export type LobbySpotifyState = UseLobbySpotifyResult;

export type SpotifySetupSource = "playlistUrl" | "findPlaylists" | "filters" | "quickPicks";

export const SMART_SEARCH_SWIPE_THRESHOLD = 68;
export const SMART_SEARCH_SWIPE_REVEAL_WIDTH = 82;

export const SMART_SEARCH_TYPES: Array<{ labelKey: string; value: SpotifySmartSearchTypeFilter }> =
  [
    { labelKey: "lobby.spotify.searchType.songs", value: "track" },
    { labelKey: "lobby.spotify.searchType.albums", value: "album" },
    { labelKey: "lobby.spotify.searchType.artists", value: "artist" },
  ];
