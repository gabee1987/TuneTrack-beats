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

export class SpotifyApiError extends Error {
  public constructor(
    public readonly code: "not_found" | "forbidden" | "unauthorized" | "api_error",
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

    const response = await fetch(
      `${SpotifyApiClient.ACCOUNTS_URL}/api/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      },
    );

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to obtain client credentials token", response.status);
    }

    return response.json() as Promise<SpotifyTokenResponse>;
  }

  public async exchangeCodeForTokens(code: string): Promise<SpotifyTokenResponse> {
    const credentials = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
    });

    const response = await fetch(
      `${SpotifyApiClient.ACCOUNTS_URL}/api/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to exchange authorization code for tokens", response.status);
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

    const response = await fetch(
      `${SpotifyApiClient.ACCOUNTS_URL}/api/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      throw new SpotifyApiError("api_error", "Failed to refresh access token", response.status);
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

      const page = await response.json() as SpotifyPlaylistTracksPage;

      for (const item of page.items) {
        if (item.track) {
          tracks.push(item.track);
        }
      }

      nextUrl = page.next;
    }

    return tracks;
  }

  public buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
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
}
