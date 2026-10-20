import { env } from "../app/env.js";
import {
  DEFAULT_SPOTIFY_ACCOUNTS_BASE_URL,
  DEFAULT_SPOTIFY_API_BASE_URL,
  SpotifyApiError,
  type SpotifyClientOptions,
  type SpotifyTokenResponse,
  type SpotifyUserProfile,
} from "./spotifyApiTypes.js";
import { getSpotifyJson } from "./spotifyRequest.js";

const HOST_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
];

/** Spotify accounts: the app's and the host's tokens, and who the host is. */
export class SpotifyAccountsClient {
  private readonly accountsBaseUrl: string;
  private readonly apiBaseUrl: string;

  public constructor(options: SpotifyClientOptions = {}) {
    this.accountsBaseUrl = options.accountsBaseUrl ?? DEFAULT_SPOTIFY_ACCOUNTS_BASE_URL;
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_SPOTIFY_API_BASE_URL;
  }

  public getClientCredentialsToken(): Promise<SpotifyTokenResponse> {
    return this.requestToken(
      new URLSearchParams({ grant_type: "client_credentials" }),
      "Failed to obtain client credentials token",
    );
  }

  public exchangeCodeForTokens(code: string, redirectUri: string): Promise<SpotifyTokenResponse> {
    return this.requestToken(
      new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      "Failed to exchange authorization code for tokens",
    );
  }

  public refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    return this.requestToken(
      new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
      "Failed to refresh access token",
    );
  }

  public getUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    return getSpotifyJson(`${this.apiBaseUrl}/me`, accessToken, "Failed to fetch user profile");
  }

  public buildAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      scope: HOST_SCOPES.join(" "),
    });

    return `${this.accountsBaseUrl}/authorize?${params.toString()}`;
  }

  private async requestToken(
    body: URLSearchParams,
    failureMessage: string,
  ): Promise<SpotifyTokenResponse> {
    const credentials = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch(`${this.accountsBaseUrl}/api/token`, {
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
        failureMessage,
        response.status,
      );
    }

    return response.json() as Promise<SpotifyTokenResponse>;
  }
}

async function parseSpotifyTokenError(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}
