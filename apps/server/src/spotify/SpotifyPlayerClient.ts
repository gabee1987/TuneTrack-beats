import {
  DEFAULT_SPOTIFY_API_BASE_URL,
  SpotifyApiError,
  type SpotifyClientOptions,
  type SpotifyPlaybackDevice,
} from "./spotifyApiTypes.js";
import { bearerHeaders } from "./spotifyRequest.js";

/** The host's Spotify Connect player: play, transfer, pause and list devices. */
export class SpotifyPlayerClient {
  private readonly apiBaseUrl: string;

  public constructor(options: SpotifyClientOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_SPOTIFY_API_BASE_URL;
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
      `${this.apiBaseUrl}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
        body: JSON.stringify({ uris: spotifyTrackUris, position_ms: positionMs }),
      },
    );

    if (response.ok) return;
    throw await deviceCommandError(response, "play");
  }

  public async transferPlaybackToDevice(
    accessToken: string,
    deviceId: string,
    play = false,
  ): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/me/player`, {
      method: "PUT",
      headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
      body: JSON.stringify({ device_ids: [deviceId], play }),
    });

    if (response.ok) return;
    throw await deviceCommandError(response, "transfer");
  }

  public async pausePlayback(accessToken: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/me/player/pause`, {
      method: "PUT",
      headers: bearerHeaders(accessToken),
    });

    // 404 = nothing is playing / no active device — treat as already paused.
    if (response.ok || response.status === 404) return;

    const body = await response.text().catch(() => "");
    throw new SpotifyApiError(
      "api_error",
      body || `Spotify pause failed with status ${response.status}`,
      response.status,
    );
  }

  public async listPlaybackDevices(accessToken: string): Promise<SpotifyPlaybackDevice[]> {
    const response = await fetch(`${this.apiBaseUrl}/me/player/devices`, {
      method: "GET",
      headers: bearerHeaders(accessToken),
    });

    if (!response.ok) throw await deviceCommandError(response, "devices list");

    const payload = (await response.json()) as { devices?: SpotifyPlaybackDevice[] };
    return Array.isArray(payload.devices) ? payload.devices : [];
  }
}

/** Only `not_found` matters to the caller: the device is not visible to Spotify yet. */
async function deviceCommandError(response: Response, command: string): Promise<SpotifyApiError> {
  const body = await response.text().catch(() => "");
  return new SpotifyApiError(
    response.status === 404 ? "not_found" : "api_error",
    body || `Spotify ${command} failed with status ${response.status}`,
    response.status,
  );
}
