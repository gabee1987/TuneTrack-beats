import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotifyPlayerClient } from "../../src/spotify/SpotifyPlayerClient.js";

const API = "http://127.0.0.1:3102/api";
const TOKEN = "TEST_HOST_TOKEN";
const DEVICE_ID = "TEST DEVICE/1";

function stubFetch(status: number, body = "") {
  const fetchMock = vi.fn(async () => new Response(status === 204 ? null : body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentRequest(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, body: init.body ? JSON.parse(String(init.body)) : undefined };
}

const player = () => new SpotifyPlayerClient({ apiBaseUrl: API });

describe("SpotifyPlayerClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays from the start on the encoded device", async () => {
    const fetchMock = stubFetch(204);

    await player().playTracksOnDevice(TOKEN, DEVICE_ID, ["spotify:track:TEST1"]);

    const { url, init, body } = sentRequest(fetchMock);
    expect(url).toBe(`${API}/me/player/play?device_id=TEST%20DEVICE%2F1`);
    expect(init.method).toBe("PUT");
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    expect(body).toEqual({ uris: ["spotify:track:TEST1"], position_ms: 0 });
  });

  it("reports a device Spotify cannot see yet as not_found", async () => {
    stubFetch(404, "Device not found");

    await expect(
      player().playTracksOnDevice(TOKEN, DEVICE_ID, ["spotify:track:TEST1"]),
    ).rejects.toMatchObject({ code: "not_found", statusCode: 404, message: "Device not found" });
  });

  it("transfers playback without starting it by default", async () => {
    const fetchMock = stubFetch(204);

    await player().transferPlaybackToDevice(TOKEN, DEVICE_ID);

    expect(sentRequest(fetchMock).body).toEqual({ device_ids: [DEVICE_ID], play: false });
  });

  it("names the command when Spotify gives no error body", async () => {
    stubFetch(502);

    await expect(player().transferPlaybackToDevice(TOKEN, DEVICE_ID, true)).rejects.toMatchObject({
      code: "api_error",
      message: "Spotify transfer failed with status 502",
    });
  });

  it.each([204, 404])("treats a pause answered with %i as paused", async (status) => {
    stubFetch(status);

    await expect(player().pausePlayback(TOKEN)).resolves.toBeUndefined();
  });

  it("reports any other pause failure", async () => {
    stubFetch(500);

    await expect(player().pausePlayback(TOKEN)).rejects.toMatchObject({
      code: "api_error",
      message: "Spotify pause failed with status 500",
    });
  });

  it("lists devices and treats a missing list as empty", async () => {
    const device = {
      id: "TEST_DEVICE_1",
      name: "Test Device",
      is_active: true,
      is_restricted: false,
    };
    stubFetch(200, JSON.stringify({ devices: [device] }));
    await expect(player().listPlaybackDevices(TOKEN)).resolves.toEqual([device]);

    stubFetch(200, JSON.stringify({}));
    await expect(player().listPlaybackDevices(TOKEN)).resolves.toEqual([]);

    stubFetch(401, "Expired");
    await expect(player().listPlaybackDevices(TOKEN)).rejects.toMatchObject({ code: "api_error" });
  });
});
