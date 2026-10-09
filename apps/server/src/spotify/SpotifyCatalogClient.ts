import {
  DEFAULT_SPOTIFY_API_BASE_URL,
  SpotifyApiError,
  isSpotifyApiAlbum,
  isSpotifyApiArtist,
  isSpotifyApiTrack,
  isSpotifyPlaylistSearchItem,
  type SpotifyAlbumResponse,
  type SpotifyAlbumSearchResponse,
  type SpotifyApiAlbum,
  type SpotifyApiArtist,
  type SpotifyApiTrack,
  type SpotifyArtistSearchResponse,
  type SpotifyClientOptions,
  type SpotifyPlaylistSearchItem,
  type SpotifyPlaylistSearchResponse,
  type SpotifyPlaylistTracksPage,
  type SpotifyTrackSearchResponse,
} from "./spotifyApiTypes.js";
import { getSpotifyJson } from "./spotifyRequest.js";

/** 10 pages of 100 tracks: the curated playlist limit of 1 000 tracks (`05` §2.4). */
export const MAX_PLAYLIST_PAGE_COUNT = 10;

type SearchType = "playlist" | "track" | "album" | "artist";

/** Spotify's public catalogue: search, playlists, albums and artists. */
export class SpotifyCatalogClient {
  private readonly apiBaseUrl: string;

  public constructor(options: SpotifyClientOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_SPOTIFY_API_BASE_URL;
  }

  public async getPlaylistName(playlistId: string, accessToken: string): Promise<string> {
    const data = await getSpotifyJson<{ name: string }>(
      `${this.apiBaseUrl}/playlists/${playlistId}?fields=name`,
      accessToken,
      "Failed to fetch playlist metadata",
    );
    return data.name;
  }

  public async getPlaylistSearchItem(
    playlistId: string,
    accessToken: string,
  ): Promise<SpotifyPlaylistSearchItem> {
    const item = await getSpotifyJson<SpotifyPlaylistSearchItem | null>(
      `${this.apiBaseUrl}/playlists/${playlistId}?fields=id,name,owner(display_name),images,tracks(total)`,
      accessToken,
      "Failed to fetch playlist metadata",
    );
    if (!isSpotifyPlaylistSearchItem(item)) {
      throw new SpotifyApiError("api_error", "Playlist metadata response is invalid");
    }

    return item;
  }

  public async searchPlaylists(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyPlaylistSearchItem[]> {
    const data = await this.search<SpotifyPlaylistSearchResponse>(
      "playlist",
      query,
      accessToken,
      limit,
      offset,
    );
    return data.playlists.items.filter(isSpotifyPlaylistSearchItem);
  }

  public async searchTracks(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyApiTrack[]> {
    const data = await this.search<SpotifyTrackSearchResponse>(
      "track",
      query,
      accessToken,
      limit,
      offset,
    );
    return data.tracks.items.filter(isSpotifyApiTrack);
  }

  public async searchAlbums(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyApiAlbum[]> {
    const data = await this.search<SpotifyAlbumSearchResponse>(
      "album",
      query,
      accessToken,
      limit,
      offset,
    );
    return data.albums.items.filter(isSpotifyApiAlbum);
  }

  public async searchArtists(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyApiArtist[]> {
    const data = await this.search<SpotifyArtistSearchResponse>(
      "artist",
      query,
      accessToken,
      limit,
      offset,
    );
    return data.artists.items.filter(isSpotifyApiArtist);
  }

  public async getAlbumTracks(albumId: string, accessToken: string): Promise<SpotifyApiTrack[]> {
    const album = await getSpotifyJson<SpotifyAlbumResponse>(
      `${this.apiBaseUrl}/albums/${albumId}?fields=id,name,artists,images,release_date,uri,total_tracks,tracks(items(id,name,artists,preview_url,uri))`,
      accessToken,
      "Failed to fetch Spotify album",
    );
    if (!isSpotifyApiAlbum(album)) {
      throw new SpotifyApiError("api_error", "Album response is invalid");
    }

    return album.tracks.items.flatMap((track) =>
      track?.id && track.name && Array.isArray(track.artists) && track.uri
        ? [
            {
              ...track,
              album: {
                name: album.name,
                release_date: album.release_date,
                images: album.images.map((image) => ({
                  url: image.url,
                  width: image.width ?? 0,
                  height: image.height ?? 0,
                })),
              },
            },
          ]
        : [],
    );
  }

  public async getArtistTopTracks(
    artistId: string,
    accessToken: string,
  ): Promise<SpotifyApiTrack[]> {
    const params = new URLSearchParams({ market: "US" });
    const data = await getSpotifyJson<{ tracks: Array<SpotifyApiTrack | null> }>(
      `${this.apiBaseUrl}/artists/${artistId}/top-tracks?${params.toString()}`,
      accessToken,
      "Failed to fetch Spotify artist tracks",
    );
    return data.tracks.filter(isSpotifyApiTrack);
  }

  public async getAllPlaylistTracks(
    playlistId: string,
    accessToken: string,
  ): Promise<SpotifyApiTrack[]> {
    const tracks: SpotifyApiTrack[] = [];
    let nextUrl: string | null =
      `${this.apiBaseUrl}/playlists/${playlistId}/tracks?limit=100&fields=next,total,items(track(id,name,artists,album,preview_url,uri))`;
    let pageCount = 0;

    while (nextUrl && pageCount < MAX_PLAYLIST_PAGE_COUNT) {
      pageCount += 1;
      const page: SpotifyPlaylistTracksPage = await getSpotifyJson(
        nextUrl,
        accessToken,
        "Failed to fetch playlist tracks",
      );

      for (const item of page.items) {
        if (item.track) {
          tracks.push(item.track);
        }
      }

      nextUrl = page.next;
    }

    return tracks;
  }

  private search<T>(
    type: SearchType,
    query: string,
    accessToken: string,
    limit: number,
    offset: number,
  ): Promise<T> {
    const params = new URLSearchParams({
      q: query,
      type,
      limit: String(limit),
      offset: String(offset),
    });

    return getSpotifyJson<T>(
      `${this.apiBaseUrl}/search?${params.toString()}`,
      accessToken,
      `Failed to search Spotify ${type}s`,
    );
  }
}
