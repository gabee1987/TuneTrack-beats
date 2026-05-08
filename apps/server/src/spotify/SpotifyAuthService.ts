import type { SpotifyAccountType, SpotifyAuthResultPayload } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
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
  roomId: string | null;
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
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "oauth_callback_rejected",
        outcome: "failed",
        roomId: state?.roomId,
        socketId,
        code: error === "access_denied" ? "auth_denied" : "unknown",
        meta: {
          spotifyError: error,
          hasCode: !!code,
          hasState: !!state,
        },
      });
      return {
        roomId: state?.roomId ?? null,
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
        logAuditEvent({
          auditKind: "spotify_auth",
          action: "token_exchange_missing_refresh_token",
          outcome: "failed",
          roomId: state.roomId,
          socketId,
        });
        return {
          roomId: state.roomId,
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
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "host_auth_succeeded",
        outcome: "succeeded",
        roomId: state.roomId,
        socketId,
        meta: {
          accountType,
          expiresInSeconds: tokenResponse.expires_in,
        },
      });

      return {
        roomId: state.roomId,
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
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "token_exchange_failed",
        outcome: "failed",
        roomId: state.roomId,
        socketId,
        code: err instanceof SpotifyApiError ? err.code : "unknown",
        meta: {
          status: err instanceof SpotifyApiError ? err.statusCode : undefined,
        },
      });

      return {
        roomId: state.roomId,
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
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "host_token_refresh_succeeded",
        outcome: "succeeded",
        roomId,
        meta: {
          expiresInSeconds: tokenResponse.expires_in,
        },
      });

      return {
        accessToken: tokenResponse.access_token,
        expiresInSeconds: tokenResponse.expires_in,
      };
    } catch (err) {
      if (err instanceof SpotifyApiError) {
        logger.warn({ roomId, code: err.code }, "Failed to refresh Spotify host token");
      }
      logAuditEvent({
        auditKind: "spotify_auth",
        action: "host_token_refresh_failed",
        outcome: "failed",
        roomId,
        code: err instanceof SpotifyApiError ? err.code : "unknown",
        meta: {
          status: err instanceof SpotifyApiError ? err.statusCode : undefined,
        },
      });
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
