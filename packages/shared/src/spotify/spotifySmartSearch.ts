import type { RoomId } from "../game/roomState.js";
import type { PublicTrackInfo } from "./playlistTracks.js";

export type SpotifySmartSearchResultType = "track" | "playlist" | "album" | "artist";
export type SpotifySmartSearchTypeFilter = "track" | "album" | "artist";

export interface SpotifySmartSearchIntent {
  rawQuery: string;
  normalizedQuery: string;
  kind: "playlist_url" | "mixed_search";
  playlistId?: string;
  year?: number;
  ownerHint?: string;
  queryWithoutQualifiers: string;
}

export interface SpotifySmartSearchResult {
  id: string;
  type: SpotifySmartSearchResultType;
  title: string;
  subtitle: string;
  artist?: string;
  albumTitle?: string;
  imageUrl?: string;
  previewUrl?: string;
  trackCount?: number;
  releaseYear?: number;
  spotifyUri?: string;
  ownerName?: string;
}

export interface SpotifySmartSearchPayload {
  roomId: RoomId;
  query: string;
  limit: number;
  offset?: number;
  types?: SpotifySmartSearchTypeFilter[];
}

export type SpotifySmartSearchResultPayload =
  | {
      success: true;
      query: string;
      parsed: SpotifySmartSearchIntent;
      results: SpotifySmartSearchResult[];
      offset: number;
      limit: number;
      hasMore: boolean;
      nextOffset?: number;
    }
  | {
      success: false;
      code: "invalid_query" | "spotify_api_error";
      message: string;
    };

export type SpotifyPlaylistDetailPayload =
  | {
      success: true;
      playlistId: string;
      sourceType?: Exclude<SpotifySmartSearchResultType, "track">;
      title: string;
      subtitle: string;
      imageUrl?: string;
      totalFetched: number;
      filteredCount: number;
      tracks: PublicTrackInfo[];
    }
  | {
      success: false;
      code: "invalid_playlist" | "spotify_api_error";
      message: string;
    };
