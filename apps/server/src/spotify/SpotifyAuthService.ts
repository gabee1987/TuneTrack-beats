import type { SpotifyAccountType, SpotifyAuthResultPayload } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { SpotifyApiClient, SpotifyApiError } from "./SpotifyApiClient.js";
import { SpotifyTokenStore } from "./SpotifyTokenStore.js";
import type { RoomId } from "@tunetrack/shared";
import {
  getPrimarySpotifyRedirectUri,
  resolveSpotifyRedirectUri,
} from "./spotifyRedirectUri.js";

interface OAuthState {
  roomId: RoomId;
  socketId: string;
  redirectUri: string;
}

export interface SpotifyCallbackResult {
  authResult: SpotifyAuthResultPayload;
  roomId: string | null;
  socketId: string;
}

export type SpotifyRefreshHostTokenResult =
  | { success: true; accessToken: string; expiresInSeconds: number }
  | { success: false; reason: "invalid_grant" | "failed" };

export class SpotifyAuthService {
  public constructor(
    private readonly apiClient: SpotifyApiClient,
    private readonly tokenStore: SpotifyTokenStore,
  ) {}

  public buildAuthUrl(roomId: RoomId, socketId: string, clientOrigin?: string): string {
    const redirectUri = resolveSpotifyRedirectUri(clientOrigin);
    const state = encodeOAuthState({ roomId, socketId, redirectUri });
    logAuditEvent({
      auditKind: "spotify_auth",
      action: "auth_url_issued",
      outcome: "succeeded",
      roomId,
      socketId,
      meta: {
        clientOrigin: clientOrigin ?? null,
        redirectUri,
      },
    });
    return this.apiClient.buildAuthUrl(state, redirectUri);
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
          message:
            error === "access_denied"
              ? "Spotify login was cancelled."
              : "Spotify authorization failed.",
        },
      };
    }

    try {
      const redirectUri = state.redirectUri || getPrimarySpotifyRedirectUri();
      const tokenResponse = await this.apiClient.exchangeCodeForTokens(code, redirectUri);

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

  public async refreshHostToken(roomId: RoomId): Promise<SpotifyRefreshHostTokenResult> {
    const record = this.tokenStore.getHostTokenRecord(roomId);
    if (!record) return { success: false, reason: "failed" };

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
        success: true,
        accessToken: tokenResponse.access_token,
        expiresInSeconds: tokenResponse.expires_in,
      };
    } catch (err) {
      if (err instanceof SpotifyApiError) {
        logger.warn({ roomId, code: err.code }, "Failed to refresh Spotify host token");
      }
      if (err instanceof SpotifyApiError && err.code === "invalid_grant") {
        this.tokenStore.clearHostTokens(roomId);
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
      return {
        success: false,
        reason:
          err instanceof SpotifyApiError && err.code === "invalid_grant"
            ? "invalid_grant"
            : "failed",
      };
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

  public async playTrackOnHostDevice(
    roomId: RoomId,
    deviceId: string,
    spotifyTrackUri: string,
  ): Promise<
    | { success: true }
    | {
        success: false;
        code: "device_not_found" | "not_connected" | "spotify_api_error";
        message: string;
      }
  > {
    let accessToken = this.getValidHostAccessToken(roomId);
    if (!accessToken) {
      const refreshed = await this.refreshHostToken(roomId);
      if (!refreshed.success) {
        return {
          success: false,
          code: "not_connected",
          message: "Spotify is not connected for this room.",
        };
      }
      accessToken = refreshed.accessToken;
    }

    // Device registration can lag behind the Web Playback SDK "ready" event.
    const retryDelaysMs = [0, 300, 700, 1200, 2000];
    let lastError: unknown;

    for (const delayMs of retryDelaysMs) {
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      try {
        await this.apiClient.playTracksOnDevice(accessToken, deviceId, [spotifyTrackUri]);
        return { success: true };
      } catch (error) {
        lastError = error;
        if (error instanceof SpotifyApiError && error.code === "not_found") {
          continue;
        }

        return {
          success: false,
          code: "spotify_api_error",
          message: "Spotify could not start playback.",
        };
      }
    }

    void lastError;
    return {
      success: false,
      code: "device_not_found",
      message: "Spotify player device is not ready yet. Try again in a moment.",
    };
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
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
      const redirectUri =
        "redirectUri" in parsed && typeof (parsed as OAuthState).redirectUri === "string"
          ? (parsed as OAuthState).redirectUri
          : getPrimarySpotifyRedirectUri();

      return {
        roomId: (parsed as OAuthState).roomId,
        socketId: (parsed as OAuthState).socketId,
        redirectUri,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function resolveAccountType(spotifyProduct: string): SpotifyAccountType {
  return spotifyProduct === "premium" ? "premium" : "free";
}
