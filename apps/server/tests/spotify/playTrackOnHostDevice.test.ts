import { describe, expect, it, vi } from "vitest";
import { SpotifyApiClient, SpotifyApiError } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyAuthService } from "../../src/spotify/SpotifyAuthService.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

const TEST_ROOM_ID = "ROOM1";
const TEST_DEVICE_ID = "TEST_DEVICE_1";
const TEST_TRACK_URI = "spotify:track:TEST0000000000000001";

function buildService(apiClientOverrides: Partial<SpotifyApiClient>) {
  const apiClient = {
    listPlaybackDevices: vi.fn(async () => [{ id: TEST_DEVICE_ID, is_restricted: false }]),
    transferPlaybackToDevice: vi.fn(async () => undefined),
    playTracksOnDevice: vi.fn(async () => undefined),
    ...apiClientOverrides,
  } as unknown as SpotifyApiClient;

  const tokenStore = new SpotifyTokenStore();
  tokenStore.setHostTokens(TEST_ROOM_ID, "access-token", "refresh-token", 3600, "premium");

  return { apiClient, service: new SpotifyAuthService(apiClient, tokenStore) };
}

describe("playTrackOnHostDevice", () => {
  it("does not transfer Connect playback when the play request can stand on its own", async () => {
    const { apiClient, service } = buildService({});

    const result = await service.playTrackOnHostDevice(
      TEST_ROOM_ID,
      TEST_DEVICE_ID,
      TEST_TRACK_URI,
      { requestId: "req-1", isSuperseded: () => false },
    );

    expect(result).toEqual({ success: true, requestId: "req-1" });
    expect(apiClient.playTracksOnDevice).toHaveBeenCalledTimes(1);
    // A transfer carries "keep the current playback state", so on the happy path it can only
    // race the play request and hand the device the previous track mid-song.
    expect(apiClient.transferPlaybackToDevice).not.toHaveBeenCalled();
  });

  it("falls back to a transfer once the device refuses a direct play", async () => {
    const playTracksOnDevice = vi
      .fn()
      .mockRejectedValueOnce(new SpotifyApiError("not_found", "device not found", 404))
      .mockResolvedValueOnce(undefined);
    const { apiClient, service } = buildService({ playTracksOnDevice });

    const result = await service.playTrackOnHostDevice(
      TEST_ROOM_ID,
      TEST_DEVICE_ID,
      TEST_TRACK_URI,
      { requestId: "req-2", isSuperseded: () => false },
    );

    expect(result).toEqual({ success: true, requestId: "req-2" });
    expect(playTracksOnDevice).toHaveBeenCalledTimes(2);
    expect(apiClient.transferPlaybackToDevice).toHaveBeenCalledTimes(1);
  });
});
