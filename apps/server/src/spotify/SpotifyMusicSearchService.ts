import type {
  PublicTrackInfo,
  SpotifyPlaylistDetailPayload,
  SpotifySmartSearchIntent,
  SpotifySmartSearchResult,
  SpotifySmartSearchResultPayload,
} from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import type { SpotifyApiTrack } from "./SpotifyApiClient.js";
import { SpotifyApiClient, SpotifyApiError } from "./SpotifyApiClient.js";
import { mapSpotifyTrackToGameCard } from "./SpotifyTrackMapper.js";
import { SpotifyTokenStore } from "./SpotifyTokenStore.js";
import { parseSpotifySmartSearchQuery } from "./SpotifySmartSearchParser.js";

export class SpotifyMusicSearchService {
  public constructor(
    private readonly apiClient: SpotifyApiClient,
    private readonly tokenStore: SpotifyTokenStore,
  ) {}

  public async search(
    roomId: string,
    query: string,
    limit: number,
    offset: number,
  ): Promise<SpotifySmartSearchResultPayload> {
    const parsed = parseSpotifySmartSearchQuery(query);
    if (!parsed) {
      return {
        success: false,
        code: "invalid_query",
        message: "Enter at least 2 characters to search Spotify.",
      };
    }

    try {
      const accessToken = await this.getOrRefreshClientCredentialsToken();
      const searchResult =
        parsed.kind === "playlist_url"
          ? await this.searchPlaylistUrl(parsed, accessToken)
          : await this.searchMixed(parsed, accessToken, limit, offset);

      return {
        success: true,
        query: parsed.rawQuery,
        parsed,
        results: searchResult.results,
        offset,
        limit,
        hasMore: searchResult.hasMore,
        ...(searchResult.nextOffset !== undefined ? { nextOffset: searchResult.nextOffset } : {}),
      };
    } catch (err) {
      logger.error({ err, roomId, query }, "Spotify smart search failed");
      return {
        success: false,
        code: "spotify_api_error",
        message: "Spotify search failed. Please try again.",
      };
    }
  }

  public async getPlaylistDetail(
    roomId: string,
    playlistId: string,
  ): Promise<SpotifyPlaylistDetailPayload> {
    const normalizedPlaylistId = playlistId.trim();
    if (!normalizedPlaylistId) {
      return {
        success: false,
        code: "invalid_playlist",
        message: "Choose a Spotify playlist to open.",
      };
    }

    try {
      const accessToken = await this.getOrRefreshClientCredentialsToken();
      const [playlist, rawTracks] = await Promise.all([
        this.apiClient.getPlaylistSearchItem(normalizedPlaylistId, accessToken),
        this.apiClient.getAllPlaylistTracks(normalizedPlaylistId, accessToken),
      ]);

      const tracks = rawTracks.flatMap((track) => {
        const card = mapSpotifyTrackToGameCard(track);
        return card ? [{ ...card, metadataStatus: card.metadataStatus ?? "imported" }] : [];
      });

      return {
        success: true,
        playlistId: playlist.id,
        title: playlist.name,
        subtitle: `${playlist.owner.display_name ?? "Spotify"} · ${playlist.tracks.total} tracks`,
        ...(playlist.images[0]?.url ? { imageUrl: playlist.images[0].url } : {}),
        totalFetched: rawTracks.length,
        filteredCount: rawTracks.length - tracks.length,
        tracks: tracks satisfies PublicTrackInfo[],
      };
    } catch (err) {
      logger.error(
        { err, roomId, playlistId: normalizedPlaylistId },
        "Spotify playlist detail failed",
      );
      return {
        success: false,
        code: "spotify_api_error",
        message: "Spotify playlist could not be opened. Please try again.",
      };
    }
  }

  private async searchPlaylistUrl(
    parsed: SpotifySmartSearchIntent,
    accessToken: string,
  ): Promise<SpotifySearchPage> {
    if (!parsed.playlistId) return { results: [], hasMore: false };

    const playlist = await this.apiClient.getPlaylistSearchItem(parsed.playlistId, accessToken);
    return {
      results: [
        {
          id: playlist.id,
          type: "playlist",
          title: playlist.name,
          subtitle: `${playlist.owner.display_name ?? "Spotify"} · ${playlist.tracks.total} tracks`,
          trackCount: playlist.tracks.total,
          ownerName: playlist.owner.display_name ?? "Spotify",
          ...(playlist.images[0]?.url ? { imageUrl: playlist.images[0].url } : {}),
        },
      ],
      hasMore: false,
    };
  }

  private async searchMixed(
    parsed: SpotifySmartSearchIntent,
    accessToken: string,
    limit: number,
    offset: number,
  ): Promise<SpotifySearchPage> {
    const perTypeLimit = Math.max(1, Math.min(limit, 20));
    const trackQuery = buildTrackSearchQuery(parsed);
    const playlistQuery = parsed.queryWithoutQualifiers;
    const [tracks, playlists] = await Promise.all([
      this.apiClient.searchTracks(trackQuery, accessToken, perTypeLimit, offset),
      offset === 0
        ? this.apiClient.searchPlaylists(playlistQuery, accessToken, perTypeLimit)
        : Promise.resolve([]),
    ]);

    const trackResults = tracks
      .filter((track) => !parsed.year || getTrackReleaseYear(track) === parsed.year)
      .map(mapTrackResult);
    const playlistResults = playlists
      .filter(
        (playlist) =>
          !parsed.ownerHint ||
          (playlist.owner.display_name ?? "")
            .toLocaleLowerCase()
            .includes(parsed.ownerHint.toLocaleLowerCase()),
      )
      .map(
        (playlist): SpotifySmartSearchResult => ({
          id: playlist.id,
          type: "playlist",
          title: playlist.name,
          subtitle: `${playlist.owner.display_name ?? "Spotify"} · ${playlist.tracks.total} tracks`,
          trackCount: playlist.tracks.total,
          ownerName: playlist.owner.display_name ?? "Spotify",
          ...(playlist.images[0]?.url ? { imageUrl: playlist.images[0].url } : {}),
        }),
      );

    return {
      results: [...trackResults, ...playlistResults].slice(0, limit),
      hasMore: tracks.length >= perTypeLimit,
      nextOffset: offset + perTypeLimit,
    };
  }

  private async getOrRefreshClientCredentialsToken(): Promise<string> {
    if (!this.tokenStore.isClientCredentialsExpired()) {
      const record = this.tokenStore.getClientCredentials();
      if (record) return record.token;
    }

    try {
      const tokenResponse = await this.apiClient.getClientCredentialsToken();
      this.tokenStore.setClientCredentials(tokenResponse.access_token, tokenResponse.expires_in);
      return tokenResponse.access_token;
    } catch (err) {
      if (err instanceof SpotifyApiError) throw err;
      throw new SpotifyApiError("api_error", "Failed to obtain client credentials token");
    }
  }
}

interface SpotifySearchPage {
  results: SpotifySmartSearchResult[];
  hasMore: boolean;
  nextOffset?: number;
}

function buildTrackSearchQuery(parsed: SpotifySmartSearchIntent): string {
  if (!parsed.year) return parsed.queryWithoutQualifiers;
  return `${parsed.queryWithoutQualifiers} year:${parsed.year}`;
}

function mapTrackResult(track: SpotifyApiTrack): SpotifySmartSearchResult {
  const releaseYear = getTrackReleaseYear(track);
  const artist = track.artists.map((item) => item.name).join(", ");
  return {
    id: track.id,
    type: "track",
    title: track.name,
    subtitle: [artist, releaseYear ? String(releaseYear) : track.album.name]
      .filter(Boolean)
      .join(" · "),
    artist,
    albumTitle: track.album.name,
    ...(releaseYear ? { releaseYear } : {}),
    ...(track.preview_url ? { previewUrl: track.preview_url } : {}),
    spotifyUri: track.uri,
    ...(track.album.images[0]?.url ? { imageUrl: track.album.images[0].url } : {}),
  };
}

function getTrackReleaseYear(track: SpotifyApiTrack): number | null {
  const year = Number.parseInt(track.album.release_date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}
