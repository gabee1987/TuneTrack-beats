import type {
  PublicTrackInfo,
  SpotifyPlaylistDetailPayload,
  SpotifySmartSearchIntent,
  SpotifySmartSearchResult,
  SpotifySmartSearchResultPayload,
  SpotifySmartSearchTypeFilter,
} from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import { dedupeTracks } from "../decks/trackDedupe.js";
import type { SpotifyApiTrack } from "./spotifyApiTypes.js";
import type { SpotifyCatalogClient } from "./SpotifyCatalogClient.js";
import type { SpotifyClientCredentials } from "./SpotifyClientCredentials.js";
import { mapSpotifyTrackToGameCard } from "./SpotifyTrackMapper.js";
import { parseSpotifySmartSearchQuery } from "./SpotifySmartSearchParser.js";
import {
  buildTrackSearchQuery,
  getTrackReleaseYear,
  mapAlbumResult,
  mapArtistResult,
  mapTrackResult,
} from "./musicSearchMappers.js";

export class SpotifyMusicSearchService {
  public constructor(
    private readonly catalog: SpotifyCatalogClient,
    private readonly clientCredentials: SpotifyClientCredentials,
  ) {}

  public async search(
    roomId: string,
    query: string,
    limit: number,
    offset: number,
    types: SpotifySmartSearchTypeFilter[],
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
      const accessToken = await this.clientCredentials.getAccessToken();
      const searchResult =
        parsed.kind === "playlist_url"
          ? await this.searchPlaylistUrl(parsed, accessToken)
          : await this.searchMixed(parsed, accessToken, limit, offset, types);

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
    sourceType: "playlist" | "album" | "artist" = "playlist",
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
      const accessToken = await this.clientCredentials.getAccessToken();
      const source = await this.getSourceTracks(normalizedPlaylistId, sourceType, accessToken);

      const tracks = source.rawTracks.flatMap((track) => {
        const card = mapSpotifyTrackToGameCard(track);
        return card ? [{ ...card, metadataStatus: card.metadataStatus ?? "imported" }] : [];
      });
      const { tracks: dedupedCards, duplicateCount } = dedupeTracks(tracks);

      return {
        success: true,
        playlistId: normalizedPlaylistId,
        sourceType,
        title: source.title,
        subtitle: source.subtitle,
        ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
        totalFetched: source.rawTracks.length,
        filteredCount: source.rawTracks.length - tracks.length + duplicateCount,
        tracks: dedupedCards satisfies PublicTrackInfo[],
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

    const playlist = await this.catalog.getPlaylistSearchItem(parsed.playlistId, accessToken);
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
    types: SpotifySmartSearchTypeFilter[],
  ): Promise<SpotifySearchPage> {
    const perTypeLimit = Math.max(1, Math.min(limit, 20));
    const trackQuery = buildTrackSearchQuery(parsed);
    const [tracks, albums, artists] = await Promise.all([
      types.includes("track")
        ? this.catalog.searchTracks(trackQuery, accessToken, perTypeLimit, offset)
        : Promise.resolve([]),
      types.includes("album")
        ? this.catalog.searchAlbums(
            parsed.queryWithoutQualifiers,
            accessToken,
            perTypeLimit,
            offset,
          )
        : Promise.resolve([]),
      types.includes("artist")
        ? this.catalog.searchArtists(
            parsed.queryWithoutQualifiers,
            accessToken,
            perTypeLimit,
            offset,
          )
        : Promise.resolve([]),
    ]);

    const trackResults = tracks
      .filter((track) => !parsed.year || getTrackReleaseYear(track) === parsed.year)
      .map(mapTrackResult);
    const albumResults = albums.map(mapAlbumResult);
    const artistResults = artists.map(mapArtistResult);

    return {
      results: [...trackResults, ...albumResults, ...artistResults].slice(0, limit),
      hasMore: Math.max(tracks.length, albums.length, artists.length) >= perTypeLimit,
      nextOffset: offset + perTypeLimit,
    };
  }

  private async getSourceTracks(
    sourceId: string,
    sourceType: "playlist" | "album" | "artist",
    accessToken: string,
  ): Promise<SpotifySourceTracks> {
    if (sourceType === "album") {
      const rawTracks = await this.catalog.getAlbumTracks(sourceId, accessToken);
      const firstTrack = rawTracks[0];
      return {
        title: firstTrack?.album.name ?? "Spotify album",
        subtitle: `${rawTracks.length} tracks`,
        ...(firstTrack?.album.images[0]?.url ? { imageUrl: firstTrack.album.images[0].url } : {}),
        rawTracks,
      };
    }

    if (sourceType === "artist") {
      const rawTracks = await this.catalog.getArtistTopTracks(sourceId, accessToken);
      const firstArtist = rawTracks[0]?.artists[0]?.name ?? "Spotify artist";
      return {
        title: firstArtist,
        subtitle: `${rawTracks.length} top tracks`,
        ...(rawTracks[0]?.album.images[0]?.url
          ? { imageUrl: rawTracks[0].album.images[0].url }
          : {}),
        rawTracks,
      };
    }

    const [playlist, rawTracks] = await Promise.all([
      this.catalog.getPlaylistSearchItem(sourceId, accessToken),
      this.catalog.getAllPlaylistTracks(sourceId, accessToken),
    ]);

    return {
      title: playlist.name,
      subtitle: `${playlist.owner.display_name ?? "Spotify"} · ${playlist.tracks.total} tracks`,
      ...(playlist.images[0]?.url ? { imageUrl: playlist.images[0].url } : {}),
      rawTracks,
    };
  }
}

interface SpotifySearchPage {
  results: SpotifySmartSearchResult[];
  hasMore: boolean;
  nextOffset?: number;
}

interface SpotifySourceTracks {
  imageUrl?: string;
  rawTracks: SpotifyApiTrack[];
  subtitle: string;
  title: string;
}
