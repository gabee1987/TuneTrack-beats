import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import {
  MAX_PLAYLIST_PAGE_COUNT,
  SpotifyCatalogClient,
} from "../../src/spotify/SpotifyCatalogClient.js";
import { SpotifyPlayerClient } from "../../src/spotify/SpotifyPlayerClient.js";

describe("Spotify Web API clients", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses injected API and accounts endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "test-token", token_type: "Bearer", expires_in: 3600 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "test-user", product: "premium" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new SpotifyAccountsClient({
      accountsBaseUrl: "http://127.0.0.1:3102/accounts",
      apiBaseUrl: "http://127.0.0.1:3102/api",
    });

    await client.getClientCredentialsToken();
    await client.getUserProfile("test-token");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:3102/accounts/api/token");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://127.0.0.1:3102/api/me");
  });

  describe("getAllPlaylistTracks", () => {
    it("stops after the page cap even when Spotify reports more pages", async () => {
      const fetchMock = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              next: "http://127.0.0.1:3102/api/playlists/TEST_PLAYLIST/tracks?offset=next",
              items: [{ track: { id: "track-12345", name: "Test Song" } }],
            }),
            { status: 200 },
          ),
      );
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifyCatalogClient({ apiBaseUrl: "http://127.0.0.1:3102/api" });
      const tracks = await client.getAllPlaylistTracks("TEST_PLAYLIST", "access-token");

      expect(fetchMock).toHaveBeenCalledTimes(MAX_PLAYLIST_PAGE_COUNT);
      expect(tracks).toHaveLength(MAX_PLAYLIST_PAGE_COUNT);
    });
  });

  describe("searchPlaylists", () => {
    it("filters null playlist search results returned by Spotify", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            playlists: {
              items: [
                null,
                {
                  id: "playlist-1",
                  name: "Japanese Rock",
                  owner: { display_name: "Spotify" },
                  images: [{ url: "https://example.com/cover.jpg", width: 300, height: 300 }],
                  tracks: { total: 42 },
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifyCatalogClient();
      const playlists = await client.searchPlaylists("japanese rock", "access-token", 10);

      expect(playlists).toEqual([
        expect.objectContaining({
          id: "playlist-1",
          name: "Japanese Rock",
        }),
      ]);
    });

    it("passes limit and offset to Spotify search", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ playlists: { items: [] } }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifyCatalogClient();
      await client.searchPlaylists("metal", "access-token", 50, 100);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const searchParams = new URL(url).searchParams;
      expect(searchParams.get("q")).toBe("metal");
      expect(searchParams.get("type")).toBe("playlist");
      expect(searchParams.get("limit")).toBe("50");
      expect(searchParams.get("offset")).toBe("100");
    });
  });

  describe("getPlaylistSearchItem", () => {
    it("fetches playlist metadata for direct playlist lookup", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "5gDErv7bMFuCFL8HO5TCdm",
            name: "Kawaii Overdrive",
            owner: { display_name: "Gabee" },
            images: [{ url: "https://example.com/kawaii.jpg", width: 300, height: 300 }],
            tracks: { total: 86 },
          }),
          { status: 200 },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifyCatalogClient();
      const playlist = await client.getPlaylistSearchItem("5gDErv7bMFuCFL8HO5TCdm", "access-token");

      expect(playlist).toEqual(
        expect.objectContaining({
          id: "5gDErv7bMFuCFL8HO5TCdm",
          name: "Kawaii Overdrive",
          tracks: { total: 86 },
        }),
      );

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/playlists/5gDErv7bMFuCFL8HO5TCdm");
      expect(url).toContain("fields=");
    });
  });

  describe("playTracksOnDevice", () => {
    it("starts the track from the beginning rather than resuming it", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifyPlayerClient();
      await client.playTracksOnDevice("access-token", "TEST_DEVICE_1", [
        "spotify:track:TEST0000000000000001",
      ]);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("device_id=TEST_DEVICE_1");
      expect(JSON.parse(String(init.body))).toEqual({
        uris: ["spotify:track:TEST0000000000000001"],
        position_ms: 0,
      });
    });

    it("honours an explicit start position", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);

      const client = new SpotifyPlayerClient();
      await client.playTracksOnDevice(
        "access-token",
        "TEST_DEVICE_1",
        ["spotify:track:TEST0000000000000001"],
        30_000,
      );

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toMatchObject({ position_ms: 30_000 });
    });
  });
});
