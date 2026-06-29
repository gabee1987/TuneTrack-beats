import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotifyApiClient } from "../../src/spotify/SpotifyApiClient.js";

describe("SpotifyApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

      const client = new SpotifyApiClient();
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

      const client = new SpotifyApiClient();
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

      const client = new SpotifyApiClient();
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
});
