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
  });
});
