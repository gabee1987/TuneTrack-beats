import type { RoomId, SpotifyPlaybackResultPayload } from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import { SpotifyApiError } from "./spotifyApiTypes.js";
import type { SpotifyAuthService } from "./SpotifyAuthService.js";
import type { SpotifyPlayerClient } from "./SpotifyPlayerClient.js";

// Web Playback SDK "ready" often precedes Connect device-list visibility,
// especially right after a host transfer. Poll long enough for Spotify.
const DEVICE_RETRY_DELAYS_MS = [0, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6000];

/** Plays and pauses on the host's Spotify device with the room's host token. */
export class SpotifyPlaybackController {
  public constructor(
    private readonly auth: SpotifyAuthService,
    private readonly player: SpotifyPlayerClient,
  ) {}

  /**
   * Best-effort pause so a previous host device releases the Spotify account
   * before the next host's Web Playback device takes over.
   */
  public async pauseRoomPlayback(roomId: RoomId): Promise<void> {
    const accessToken = await this.auth.resolveHostAccessToken(roomId);
    if (!accessToken) return;

    try {
      await this.player.pausePlayback(accessToken);
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
  ): Promise<SpotifyPlaybackResultPayload> {
    const { requestId, isSuperseded } = options;

    if (isSuperseded()) return supersededResult(requestId);

    const accessToken = await this.auth.resolveHostAccessToken(roomId);
    if (!accessToken) {
      return {
        success: false,
        requestId,
        code: "not_connected",
        message: "Spotify is not connected for this room.",
      };
    }

    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex < DEVICE_RETRY_DELAYS_MS.length; attemptIndex += 1) {
      const delayMs = DEVICE_RETRY_DELAYS_MS[attemptIndex] ?? 0;
      if (isSuperseded()) return supersededResult(requestId);

      if (delayMs > 0) {
        await sleep(delayMs);
      }

      if (isSuperseded()) return supersededResult(requestId);

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
            await this.player.transferPlaybackToDevice(accessToken, playableDeviceId, false);
          } catch (transferError) {
            if (!(transferError instanceof SpotifyApiError && transferError.code === "not_found")) {
              lastError = transferError;
            }
          }

          if (isSuperseded()) return supersededResult(requestId);
        }

        await this.player.playTracksOnDevice(accessToken, playableDeviceId, [spotifyTrackUri]);
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
      const devices = await this.player.listPlaybackDevices(accessToken);
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

function supersededResult(requestId: string): SpotifyPlaybackResultPayload {
  return {
    success: false,
    requestId,
    code: "superseded",
    message: "A newer playback request replaced this one.",
  };
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
