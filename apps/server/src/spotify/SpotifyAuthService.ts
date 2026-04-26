import type { SpotifyAccountType, SpotifyAuthResultPayload } from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import { SpotifyApiClient, SpotifyApiError } from "./SpotifyApiClient.js";
import { SpotifyTokenStore } from "./SpotifyTokenStore.js";
import type { RoomId } from "@tunetrack/shared";

interface OAuthState {
  roomId: RoomId;
  socketId: string;
}

export interface SpotifyCallbackResult {
  authResult: SpotifyAuthResultPayload;
  socketId: string;
}

export class SpotifyAuthService {
  public constructor(
    private readonly apiClient: SpotifyApiClient,
    private readonly tokenStore: SpotifyTokenStore,
  ) {}

  public buildAuthUrl(roomId: RoomId, socketId: string): string {
    const state = encodeOAuthState({ roomId, socketId });
    return this.apiClient.buildAuthUrl(state);
  }

  public async handleCallback(
    code: string | undefined,
    rawState: string | undefined,
    error: string | undefined,
  ): Promise<SpotifyCallbackResult> {
    const state = rawState ? decodeOAuthState(rawState) : null;
    const socketId = state?.socketId ?? "";

    if (error || !code || !state) {
      return {
        socketId,
        authResult: {
          success: false,
          code: error === "access_denied" ? "auth_denied" : "unknown",
          message: error === "access_denied"
            ? "Spotify login was cancelled."
            : "Spotify authorization failed.",
        },
      };
    }

    try {
      const tokenResponse = await this.apiClient.exchangeCodeForTokens(code);

      if (!tokenResponse.refresh_token) {
        return {
          socketId,
          authResult: {
            success: false,
            code: "exchange_failed",
            message: "Spotify did not return a refresh token.",
          },
        };
      }

      const profile = await this.apiClient.getUserProfile(tokenResponse.access_token);
      const accountType = resolveAccountType(profile.product);

      this.tokenStore.setHostTokens(
        state.roomId,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in,
        accountType,
      );

      logger.info({ roomId: state.roomId, accountType }, "Spotify host auth successful");

      return {
        socketId,
        authResult: {
          success: true,
          accessToken: tokenResponse.access_token,
          accountType,
          expiresInSeconds: tokenResponse.expires_in,
        },
      };
    } catch (err) {
      logger.error({ err }, "Spotify OAuth callback failed");

      return {
        socketId,
        authResult: {
          success: false,
          code: "exchange_failed",
          message: "Could not complete Spotify login. Please try again.",
        },
      };
    }
  }

  public async refreshHostToken(
    roomId: RoomId,
  ): Promise<{ accessToken: string; expiresInSeconds: number } | null> {
    const record = this.tokenStore.getHostTokenRecord(roomId);
    if (!record) return null;

    try {
      const tokenResponse = await this.apiClient.refreshAccessToken(record.refreshToken);

      this.tokenStore.updateHostAccessToken(
        roomId,
        tokenResponse.access_token,
        tokenResponse.expires_in,
      );

      return {
        accessToken: tokenResponse.access_token,
        expiresInSeconds: tokenResponse.expires_in,
      };
    } catch (err) {
      if (err instanceof SpotifyApiError) {
        logger.warn({ roomId, code: err.code }, "Failed to refresh Spotify host token");
      }
      return null;
    }
  }

  public getValidHostAccessToken(roomId: RoomId): string | null {
    const record = this.tokenStore.getHostTokenRecord(roomId);
    if (!record) return null;
    if (this.tokenStore.isHostTokenExpired(roomId)) return null;
    return record.accessToken;
  }

  public clearHostTokens(roomId: RoomId): void {
    this.tokenStore.clearHostTokens(roomId);
  }

  public isRoomSpotifyConnected(roomId: RoomId): boolean {
    return this.tokenStore.getHostTokenRecord(roomId) !== null;
  }
}

function encodeOAuthState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeOAuthState(raw: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "roomId" in parsed &&
      "socketId" in parsed &&
      typeof (parsed as OAuthState).roomId === "string" &&
      typeof (parsed as OAuthState).socketId === "string"
    ) {
      return parsed as OAuthState;
    }

    return null;
  } catch {
    return null;
  }
}

function resolveAccountType(spotifyProduct: string): SpotifyAccountType {
  return spotifyProduct === "premium" ? "premium" : "free";
}
