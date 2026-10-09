import type { SpotifyAccountType, SpotifyAuthResultPayload } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import type { SpotifyAccountsClient } from "./SpotifyAccountsClient.js";
import { SpotifyApiError } from "./spotifyApiTypes.js";
import { SpotifyOAuthStateStore, type PendingOAuthState } from "./SpotifyOAuthStateStore.js";
import { SpotifyTokenStore } from "./SpotifyTokenStore.js";
import type { RoomId } from "@tunetrack/shared";
import { resolveSpotifyRedirectUri } from "./spotifyRedirectUri.js";

export interface SpotifyCallbackResult {
  authResult: SpotifyAuthResultPayload;
  roomId: string | null;
  socketId: string;
}

export type IsRoomHostSocket = (roomId: RoomId, socketId: string) => boolean;

export type SpotifyRefreshHostTokenResult =
  | { success: true; accessToken: string; expiresInSeconds: number }
  | { success: false; reason: "invalid_grant" | "failed" };

export class SpotifyAuthService {
  public constructor(
    private readonly accounts: SpotifyAccountsClient,
    private readonly tokenStore: SpotifyTokenStore,
    private readonly oauthStates = new SpotifyOAuthStateStore(),
  ) {}

  private readonly hostRefreshesInFlight = new Map<
    RoomId,
    Promise<SpotifyRefreshHostTokenResult>
  >();

  public buildAuthUrl(roomId: RoomId, socketId: string, clientOrigin?: string): string {
    const redirectUri = resolveSpotifyRedirectUri(clientOrigin);
    const state = this.oauthStates.issue({ roomId, socketId, redirectUri });
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
    return this.accounts.buildAuthUrl(state, redirectUri);
  }

  public async handleCallback(
    code: string | undefined,
    rawState: string | undefined,
    error: string | undefined,
    isRoomHostSocket: IsRoomHostSocket,
  ): Promise<SpotifyCallbackResult> {
    const state = rawState ? this.oauthStates.consume(rawState) : null;
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

    if (!isRoomHostSocket(state.roomId, state.socketId)) {
      return rejectNonHostCallback(state, "before_token_exchange");
    }

    try {
      const tokenResponse = await this.accounts.exchangeCodeForTokens(code, state.redirectUri);

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

      const profile = await this.accounts.getUserProfile(tokenResponse.access_token);
      const accountType = resolveAccountType(profile.product);

      // Host may have changed or left while the browser was on the Spotify consent page.
      if (!isRoomHostSocket(state.roomId, state.socketId)) {
        return rejectNonHostCallback(state, "after_token_exchange");
      }

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

  /** Concurrent refreshes for one room share a request, so a rotated token is never raced (B-19). */
  public refreshHostToken(roomId: RoomId): Promise<SpotifyRefreshHostTokenResult> {
    const pending = this.hostRefreshesInFlight.get(roomId);
    if (pending) return pending;

    const refresh = this.performHostTokenRefresh(roomId).finally(() =>
      this.hostRefreshesInFlight.delete(roomId),
    );
    this.hostRefreshesInFlight.set(roomId, refresh);
    return refresh;
  }

  private async performHostTokenRefresh(roomId: RoomId): Promise<SpotifyRefreshHostTokenResult> {
    const record = this.tokenStore.getHostTokenRecord(roomId);
    if (!record) return { success: false, reason: "failed" };

    try {
      const tokenResponse = await this.accounts.refreshAccessToken(record.refreshToken);

      this.tokenStore.updateHostAccessToken(
        roomId,
        tokenResponse.access_token,
        tokenResponse.expires_in,
        tokenResponse.refresh_token,
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

  public retargetRoom(previousRoomId: RoomId, nextRoomId: RoomId): void {
    this.tokenStore.retargetRoom(previousRoomId, nextRoomId);
    this.oauthStates.retargetRoom(previousRoomId, nextRoomId);
  }

  public isRoomSpotifyConnected(roomId: RoomId): boolean {
    return this.tokenStore.getHostTokenRecord(roomId) !== null;
  }

  /** A usable host token: the stored one, or a refreshed one once it expired. */
  public async resolveHostAccessToken(roomId: RoomId): Promise<string | null> {
    const accessToken = this.getValidHostAccessToken(roomId);
    if (accessToken) return accessToken;

    const refreshed = await this.refreshHostToken(roomId);
    return refreshed.success ? refreshed.accessToken : null;
  }
}

function rejectNonHostCallback(
  state: PendingOAuthState,
  stage: "before_token_exchange" | "after_token_exchange",
): SpotifyCallbackResult {
  logAuditEvent({
    auditKind: "spotify_auth",
    action: "oauth_callback_rejected",
    outcome: "failed",
    roomId: state.roomId,
    socketId: state.socketId,
    code: "not_host",
    meta: { stage },
  });
  return {
    roomId: state.roomId,
    socketId: state.socketId,
    authResult: {
      success: false,
      code: "unknown",
      message: "Only the current host can connect Spotify for this room.",
    },
  };
}

function resolveAccountType(spotifyProduct: string): SpotifyAccountType {
  return spotifyProduct === "premium" ? "premium" : "free";
}
