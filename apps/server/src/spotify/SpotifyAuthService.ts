import type { SpotifyAccountType, SpotifyAuthResultPayload } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { SpotifyApiClient, SpotifyApiError } from "./SpotifyApiClient.js";
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
    private readonly apiClient: SpotifyApiClient,
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
    return this.apiClient.buildAuthUrl(state, redirectUri);
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
      const tokenResponse = await this.apiClient.exchangeCodeForTokens(code, state.redirectUri);

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
      const tokenResponse = await this.apiClient.refreshAccessToken(record.refreshToken);

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

  /**
   * Best-effort pause so a previous host device releases the Spotify account
   * before the next host's Web Playback device takes over.
   */
  public async pauseRoomPlayback(roomId: RoomId): Promise<void> {
    let accessToken = this.getValidHostAccessToken(roomId);
    if (!accessToken) {
      const refreshed = await this.refreshHostToken(roomId);
      if (!refreshed.success) {
        return;
      }
      accessToken = refreshed.accessToken;
    }

    try {
      await this.apiClient.pausePlayback(accessToken);
    } catch (error) {
      logger.warn(
        { roomId, error: summarizeUnknownError(error) },
        "Spotify pause during playback handoff failed",
      );
    }
  }

  public async playTrackOnHostDevice(
    roomId: RoomId,
    deviceId: string,
    spotifyTrackUri: string,
    options: {
      requestId: string;
      isSuperseded: () => boolean;
    },
  ): Promise<
    | { success: true; requestId: string }
    | {
        success: false;
        requestId: string;
        code: "device_not_found" | "not_connected" | "spotify_api_error" | "superseded";
        message: string;
      }
  > {
    const { requestId, isSuperseded } = options;

    if (isSuperseded()) {
      return {
        success: false,
        requestId,
        code: "superseded",
        message: "A newer playback request replaced this one.",
      };
    }

    let accessToken = this.getValidHostAccessToken(roomId);
    if (!accessToken) {
      const refreshed = await this.refreshHostToken(roomId);
      if (!refreshed.success) {
        return {
          success: false,
          requestId,
          code: "not_connected",
          message: "Spotify is not connected for this room.",
        };
      }
      accessToken = refreshed.accessToken;
    }

    // Web Playback SDK "ready" often precedes Connect device-list visibility,
    // especially right after a host transfer. Poll long enough for Spotify.
    const retryDelaysMs = [0, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6000];
    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex < retryDelaysMs.length; attemptIndex += 1) {
      const delayMs = retryDelaysMs[attemptIndex] ?? 0;
      if (isSuperseded()) {
        return {
          success: false,
          requestId,
          code: "superseded",
          message: "A newer playback request replaced this one.",
        };
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }

      if (isSuperseded()) {
        return {
          success: false,
          requestId,
          code: "superseded",
          message: "A newer playback request replaced this one.",
        };
      }

      try {
        const listedDeviceId = await this.resolvePlayableDeviceId(accessToken, deviceId);
        // Prefer a listed device, but still attempt the SDK-reported id — Spotify
        // sometimes accepts play before the device appears in /me/player/devices.
        const playableDeviceId = listedDeviceId ?? deviceId;

        // Transfer is recovery, not routine. A play request already targets the device, while
        // a transfer carries `play: false` — "keep the current playback state" — which hands
        // the device the *previous* track at its current position. Sent alongside the play on
        // every card, the two commands raced inside Spotify, and whenever the transfer settled
        // last the host heard the previous song resume mid-way with nothing to correct it.
        if (attemptIndex > 0) {
          try {
            await this.apiClient.transferPlaybackToDevice(accessToken, playableDeviceId, false);
          } catch (transferError) {
            if (!(transferError instanceof SpotifyApiError && transferError.code === "not_found")) {
              lastError = transferError;
            }
          }

          if (isSuperseded()) {
            return {
              success: false,
              requestId,
              code: "superseded",
              message: "A newer playback request replaced this one.",
            };
          }
        }

        await this.apiClient.playTracksOnDevice(accessToken, playableDeviceId, [spotifyTrackUri]);
        return { success: true, requestId };
      } catch (error) {
        lastError = error;
        if (error instanceof SpotifyApiError && error.code === "not_found") {
          continue;
        }

        return {
          success: false,
          requestId,
          code: "spotify_api_error",
          message: "Spotify could not start playback.",
        };
      }
    }

    logger.warn(
      { roomId, deviceId, requestId, lastError: summarizeUnknownError(lastError) },
      "Spotify play device never became available",
    );

    return {
      success: false,
      requestId,
      code: "device_not_found",
      message: "Spotify player device is not ready yet. Try again in a moment.",
    };
  }

  private async resolvePlayableDeviceId(
    accessToken: string,
    preferredDeviceId: string,
  ): Promise<string | null> {
    try {
      const devices = await this.apiClient.listPlaybackDevices(accessToken);
      const preferred = devices.find(
        (device) => device.id === preferredDeviceId && !device.is_restricted,
      );
      // Do not fall back to another TuneTrack device — after host transfer the
      // previous browser's device can still linger and would steal playback.
      return preferred?.id ?? null;
    } catch (error) {
      logger.warn({ error }, "Could not list Spotify playback devices");
      return preferredDeviceId;
    }
  }
}

function summarizeUnknownError(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
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
