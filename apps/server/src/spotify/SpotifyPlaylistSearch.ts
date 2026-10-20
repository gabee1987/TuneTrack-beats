import type { SpotifyPlaylistSearchResultPayload } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { SpotifyApiError, type SpotifyPlaylistSearchItem } from "./spotifyApiTypes.js";
import type { SpotifyCatalogClient } from "./SpotifyCatalogClient.js";
import type { SpotifyClientCredentials } from "./SpotifyClientCredentials.js";
import { extractSpotifyPlaylistId } from "./spotifyUrlParser.js";

const SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE = 50;
const SPOTIFY_PLAYLIST_SEARCH_MAX_PAGES = 4;
const SPOTIFY_PLAYLIST_ID_REGEX = /^[a-zA-Z0-9]{22}$/;

/** Playlist search by text, link or bare id, with Spotify's empty pages skipped. */
export class SpotifyPlaylistSearch {
  public constructor(
    private readonly catalog: SpotifyCatalogClient,
    private readonly clientCredentials: SpotifyClientCredentials,
  ) {}

  public async searchPlaylists(
    roomId: string,
    query: string,
    limit: number,
  ): Promise<SpotifyPlaylistSearchResultPayload> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return {
        success: false,
        code: "invalid_query",
        message: "Enter at least 2 characters to search Spotify playlists.",
      };
    }

    try {
      const accessToken = await this.clientCredentials.getAccessToken();
      const directPlaylistId = extractPlaylistIdFromSearchQuery(trimmedQuery);
      const playlists = directPlaylistId
        ? [await this.catalog.getPlaylistSearchItem(directPlaylistId, accessToken)]
        : await this.searchUsablePlaylists(trimmedQuery, accessToken, limit);

      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_search_succeeded",
        outcome: "succeeded",
        roomId,
        meta: {
          query: trimmedQuery,
          resultCount: playlists.length,
        },
      });

      return {
        success: true,
        query: trimmedQuery,
        playlists: playlists.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          ownerName: playlist.owner.display_name ?? "Spotify",
          trackCount: playlist.tracks.total,
          ...(playlist.images[0]?.url ? { imageUrl: playlist.images[0].url } : {}),
        })),
      };
    } catch (err) {
      logger.error({ err, roomId, query: trimmedQuery }, "Spotify playlist search failed");
      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_search_failed",
        outcome: "failed",
        roomId,
        code: err instanceof SpotifyApiError ? err.code : "spotify_api_error",
        meta: {
          query: trimmedQuery,
          status: err instanceof SpotifyApiError ? err.statusCode : undefined,
        },
      });

      return {
        success: false,
        code: "spotify_api_error",
        message: "Spotify playlist search failed. Please try again.",
      };
    }
  }

  public async searchUsablePlaylists(
    query: string,
    accessToken: string,
    limit: number,
  ): Promise<SpotifyPlaylistSearchItem[]> {
    const targetCount = Math.min(Math.max(limit, 1), SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE);
    const playlists: SpotifyPlaylistSearchItem[] = [];
    const seenPlaylistIds = new Set<string>();
    const queries = buildPlaylistSearchQueries(query);

    for (const searchQuery of queries) {
      for (
        let pageIndex = 0;
        playlists.length < targetCount && pageIndex < SPOTIFY_PLAYLIST_SEARCH_MAX_PAGES;
        pageIndex++
      ) {
        const page = await this.catalog.searchPlaylists(
          searchQuery,
          accessToken,
          SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE,
          pageIndex * SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE,
        );

        if (page.length === 0) continue;

        for (const playlist of page) {
          if (seenPlaylistIds.has(playlist.id)) continue;
          seenPlaylistIds.add(playlist.id);
          playlists.push(playlist);
          if (playlists.length >= targetCount) break;
        }
      }
    }

    return playlists;
  }
}

function extractPlaylistIdFromSearchQuery(query: string): string | null {
  const playlistId = extractSpotifyPlaylistId(query);
  if (playlistId) return playlistId;

  const trimmedQuery = query.trim();
  return SPOTIFY_PLAYLIST_ID_REGEX.test(trimmedQuery) ? trimmedQuery : null;
}

function buildPlaylistSearchQueries(query: string): string[] {
  const trimmedQuery = query.trim();
  const queries = [trimmedQuery];

  if (/\s/.test(trimmedQuery) && !/^".*"$/.test(trimmedQuery)) {
    queries.push(`"${trimmedQuery}"`);
  }

  return queries;
}
