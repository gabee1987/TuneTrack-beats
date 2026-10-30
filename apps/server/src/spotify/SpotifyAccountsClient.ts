import { env } from "../app/env.js";
import {
  DEFAULT_SPOTIFY_ACCOUNTS_BASE_URL,
  DEFAULT_SPOTIFY_API_BASE_URL,
  SpotifyApiError,
  type SpotifyClientOptions,
  type SpotifyTokenResponse,
  type SpotifyUpstreamError,
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
      const upstream = await parseSpotifyTokenError(response);
      throw new SpotifyApiError(
        tokenErrorCode(upstream.upstreamError),
        failureMessage,
        response.status,
        upstream,
      );
    }

    return response.json() as Promise<SpotifyTokenResponse>;
  }
}

function tokenErrorCode(
  upstreamError: string | undefined,
): "invalid_grant" | "invalid_client" | "api_error" {
  switch (upstreamError) {
    case "invalid_grant":
      return "invalid_grant";
    case "invalid_client":
      return "invalid_client";
    default:
      return "api_error";
  }
}

async function parseSpotifyTokenError(response: Response): Promise<SpotifyUpstreamError> {
  try {
    const body = (await response.json()) as { error?: unknown; error_description?: unknown };
    return {
      upstreamError: typeof body.error === "string" ? body.error : undefined,
      upstreamErrorDescription:
        typeof body.error_description === "string" ? body.error_description : undefined,
    };
  } catch {
    return {};
  }
}
