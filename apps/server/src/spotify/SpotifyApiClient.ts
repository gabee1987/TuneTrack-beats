import { env } from "../app/env.js";

export interface SpotifyApiTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    release_date: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  preview_url: string | null;
  uri: string;
}

export interface SpotifyUserProfile {
  id: string;
  product: string;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface SpotifyPlaylistTracksPage {
  items: Array<{ track: SpotifyApiTrack | null }>;
  next: string | null;
  total: number;
}

export interface SpotifyPlaylistSearchItem {
  id: string;
  name: string;
  owner: {
    display_name: string | null;
  };
  images: Array<{ url: string; width: number | null; height: number | null }>;
  tracks: {
    total: number;
  };
}

interface SpotifyPlaylistSearchResponse {
  playlists: {
    items: Array<SpotifyPlaylistSearchItem | null>;
  };
}

export interface SpotifyApiAlbum {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  images: Array<{ url: string; width: number | null; height: number | null }>;
  release_date: string;
  uri: string;
  total_tracks: number;
}

export interface SpotifyApiArtist {
  id: string;
  name: string;
  images: Array<{ url: string; width: number | null; height: number | null }>;
  uri: string;
}

interface SpotifyTrackSearchResponse {
  tracks: {
    items: Array<SpotifyApiTrack | null>;
  };
}

interface SpotifyAlbumSearchResponse {
  albums: {
    items: Array<SpotifyApiAlbum | null>;
  };
}

interface SpotifyArtistSearchResponse {
  artists: {
    items: Array<SpotifyApiArtist | null>;
  };
}

interface SpotifyAlbumResponse extends SpotifyApiAlbum {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      preview_url: string | null;
      uri: string;
    } | null>;
  };
}

interface SpotifyPlaylistMetadata {
  name: string;
}

export class SpotifyApiError extends Error {
  public constructor(
    public readonly code:
      | "not_found"
      | "forbidden"
      | "unauthorized"
      | "invalid_grant"
      | "api_error",
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

export class SpotifyApiClient {
  private static readonly BASE_URL = "https://api.spotify.com/v1";
  private static readonly ACCOUNTS_URL = "https://accounts.spotify.com";

  public async getClientCredentialsToken(): Promise<SpotifyTokenResponse> {
    const credentials = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch(`${SpotifyApiClient.ACCOUNTS_URL}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new SpotifyApiError(
        "api_error",
        "Failed to obtain client credentials token",
        response.status,
      );
    }

    return response.json() as Promise<SpotifyTokenResponse>;
  }

  public async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<SpotifyTokenResponse> {
    const credentials = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(`${SpotifyApiClient.ACCOUNTS_URL}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new SpotifyApiError(
        "api_error",
        "Failed to exchange authorization code for tokens",
        response.status,
      );
    }

    return response.json() as Promise<SpotifyTokenResponse>;
  }

  public async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    const credentials = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(`${SpotifyApiClient.ACCOUNTS_URL}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const tokenError = await parseSpotifyTokenError(response);
      throw new SpotifyApiError(
        tokenError === "invalid_grant" ? "invalid_grant" : "api_error",
        "Failed to refresh access token",
        response.status,
      );
    }

    return response.json() as Promise<SpotifyTokenResponse>;
  }

  public async getUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    const response = await fetch(`${SpotifyApiClient.BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to fetch user profile", response.status);
    }

    return response.json() as Promise<SpotifyUserProfile>;
  }

  public async getPlaylistName(playlistId: string, accessToken: string): Promise<string> {
    const response = await fetch(
      `${SpotifyApiClient.BASE_URL}/playlists/${playlistId}?fields=name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to fetch playlist metadata", response.status);
    }

    const data = (await response.json()) as SpotifyPlaylistMetadata;
    return data.name;
  }

  public async getPlaylistSearchItem(
    playlistId: string,
    accessToken: string,
  ): Promise<SpotifyPlaylistSearchItem> {
    const response = await fetch(
      `${SpotifyApiClient.BASE_URL}/playlists/${playlistId}?fields=id,name,owner(display_name),images,tracks(total)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (response.status === 404) {
      throw new SpotifyApiError("not_found", "Playlist not found", 404);
    }

    if (response.status === 403) {
      throw new SpotifyApiError("forbidden", "Playlist is private or access is forbidden", 403);
    }

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to fetch playlist metadata", response.status);
    }

    const item = (await response.json()) as SpotifyPlaylistSearchItem | null;
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
    const params = new URLSearchParams({
      q: query,
      type: "playlist",
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(`${SpotifyApiClient.BASE_URL}/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to search Spotify playlists", response.status);
    }

    const data = (await response.json()) as SpotifyPlaylistSearchResponse;
    return data.playlists.items.filter(isSpotifyPlaylistSearchItem);
  }

  public async searchTracks(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyApiTrack[]> {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(`${SpotifyApiClient.BASE_URL}/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to search Spotify tracks", response.status);
    }

    const data = (await response.json()) as SpotifyTrackSearchResponse;
    return data.tracks.items.filter(isSpotifyApiTrack);
  }

  public async searchAlbums(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyApiAlbum[]> {
    const params = new URLSearchParams({
      q: query,
      type: "album",
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(`${SpotifyApiClient.BASE_URL}/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to search Spotify albums", response.status);
    }

    const data = (await response.json()) as SpotifyAlbumSearchResponse;
    return data.albums.items.filter(isSpotifyApiAlbum);
  }

  public async searchArtists(
    query: string,
    accessToken: string,
    limit: number,
    offset = 0,
  ): Promise<SpotifyApiArtist[]> {
    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(`${SpotifyApiClient.BASE_URL}/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to search Spotify artists", response.status);
    }

    const data = (await response.json()) as SpotifyArtistSearchResponse;
    return data.artists.items.filter(isSpotifyApiArtist);
  }

  public async getAlbumTracks(albumId: string, accessToken: string): Promise<SpotifyApiTrack[]> {
    const response = await fetch(
      `${SpotifyApiClient.BASE_URL}/albums/${albumId}?fields=id,name,artists,images,release_date,uri,total_tracks,tracks(items(id,name,artists,preview_url,uri))`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (response.status === 404) {
      throw new SpotifyApiError("not_found", "Album not found", 404);
    }

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to fetch Spotify album", response.status);
    }

    const album = (await response.json()) as SpotifyAlbumResponse;
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
    const response = await fetch(
      `${SpotifyApiClient.BASE_URL}/artists/${artistId}/top-tracks?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (response.status === 404) {
      throw new SpotifyApiError("not_found", "Artist not found", 404);
    }

    if (response.status === 401) {
      throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
    }

    if (!response.ok) {
      throw new SpotifyApiError(
        "api_error",
        "Failed to fetch Spotify artist tracks",
        response.status,
      );
    }

    const data = (await response.json()) as { tracks: Array<SpotifyApiTrack | null> };
    return data.tracks.filter(isSpotifyApiTrack);
  }

  public async getAllPlaylistTracks(
    playlistId: string,
    accessToken: string,
  ): Promise<SpotifyApiTrack[]> {
    const tracks: SpotifyApiTrack[] = [];
    let nextUrl: string | null =
      `${SpotifyApiClient.BASE_URL}/playlists/${playlistId}/tracks?limit=100&fields=next,total,items(track(id,name,artists,album,preview_url,uri))`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 404) {
        throw new SpotifyApiError("not_found", "Playlist not found", 404);
      }

      if (response.status === 403) {
        throw new SpotifyApiError("forbidden", "Playlist is private or access is forbidden", 403);
      }

      if (response.status === 401) {
        throw new SpotifyApiError("unauthorized", "Access token is invalid or expired", 401);
      }

      if (!response.ok) {
        throw new SpotifyApiError("api_error", "Failed to fetch playlist tracks", response.status);
      }

      const page = (await response.json()) as SpotifyPlaylistTracksPage;

      for (const item of page.items) {
        if (item.track) {
          tracks.push(item.track);
        }
      }

      nextUrl = page.next;
    }

    return tracks;
  }

  public buildAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      scope: [
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
        "streaming",
        "user-read-email",
        "user-read-private",
      ].join(" "),
    });

    return `${SpotifyApiClient.ACCOUNTS_URL}/authorize?${params.toString()}`;
  }

  /**
   * `position_ms` is explicit because Spotify treats a play request for the URI already on
   * the device as a resume, so a card coming round again started wherever it was left.
   */
  public async playTracksOnDevice(
    accessToken: string,
    deviceId: string,
    spotifyTrackUris: string[],
    positionMs = 0,
  ): Promise<void> {
    const response = await fetch(
      `${SpotifyApiClient.BASE_URL}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: spotifyTrackUris, position_ms: positionMs }),
      },
    );

    if (response.ok || response.status === 204) {
      return;
    }

    const body = await response.text().catch(() => "");
    throw new SpotifyApiError(
      response.status === 404 ? "not_found" : "api_error",
      body || `Spotify play failed with status ${response.status}`,
      response.status,
    );
  }

  public async transferPlaybackToDevice(
    accessToken: string,
    deviceId: string,
    play = false,
  ): Promise<void> {
    const response = await fetch(`${SpotifyApiClient.BASE_URL}/me/player`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play,
      }),
    });

    if (response.ok || response.status === 204) {
      return;
    }

    const body = await response.text().catch(() => "");
    throw new SpotifyApiError(
      response.status === 404 ? "not_found" : "api_error",
      body || `Spotify transfer failed with status ${response.status}`,
      response.status,
    );
  }

  public async pausePlayback(accessToken: string): Promise<void> {
    const response = await fetch(`${SpotifyApiClient.BASE_URL}/me/player/pause`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 404 = nothing is playing / no active device — treat as already paused.
    if (response.ok || response.status === 204 || response.status === 404) {
      return;
    }

    const body = await response.text().catch(() => "");
    throw new SpotifyApiError(
      "api_error",
      body || `Spotify pause failed with status ${response.status}`,
      response.status,
    );
  }

  public async listPlaybackDevices(accessToken: string): Promise<SpotifyPlaybackDevice[]> {
    const response = await fetch(`${SpotifyApiClient.BASE_URL}/me/player/devices`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SpotifyApiError(
        response.status === 404 ? "not_found" : "api_error",
        body || `Spotify devices list failed with status ${response.status}`,
        response.status,
      );
    }

    const payload = (await response.json()) as { devices?: SpotifyPlaybackDevice[] };
    return Array.isArray(payload.devices) ? payload.devices : [];
  }
}

export interface SpotifyPlaybackDevice {
  id: string | null;
  name: string;
  is_active: boolean;
  is_restricted: boolean;
}

function isSpotifyPlaylistSearchItem(
  item: SpotifyPlaylistSearchItem | null,
): item is SpotifyPlaylistSearchItem {
  return Boolean(
    item?.id &&
    item.name &&
    item.owner &&
    Array.isArray(item.images) &&
    typeof item.tracks?.total === "number",
  );
}

function isSpotifyApiTrack(track: SpotifyApiTrack | null): track is SpotifyApiTrack {
  return Boolean(
    track?.id &&
      track.name &&
      Array.isArray(track.artists) &&
      track.album &&
      Array.isArray(track.album.images) &&
      track.uri,
  );
}

function isSpotifyApiAlbum(album: SpotifyApiAlbum | null): album is SpotifyApiAlbum {
  return Boolean(
    album?.id &&
      album.name &&
      Array.isArray(album.artists) &&
      Array.isArray(album.images) &&
      album.release_date &&
      album.uri &&
      typeof album.total_tracks === "number",
  );
}

function isSpotifyApiArtist(artist: SpotifyApiArtist | null): artist is SpotifyApiArtist {
  return Boolean(
    artist?.id && artist.name && Array.isArray(artist.images) && artist.uri,
  );
}

async function parseSpotifyTokenError(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}
