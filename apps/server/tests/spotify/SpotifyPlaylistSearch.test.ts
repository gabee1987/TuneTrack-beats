import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import { SpotifyApiError } from "../../src/spotify/spotifyApiTypes.js";
import { SpotifyPlaylistSearch } from "../../src/spotify/SpotifyPlaylistSearch.js";
import {
  asCatalogClient,
  createAppCredentials,
  createFakeCatalog,
  spotifyPlaylist,
  TEST_APP_TOKEN,
  type FakeCatalog,
} from "../support/fakeSpotifyCatalog.js";

const ROOM_ID = "TEST_ROOM_1";
const PLAYLIST_ID = "TESTPLAYLIST1234567890"; // 22 characters, Spotify's id length

let catalog: FakeCatalog;
let search: SpotifyPlaylistSearch;

beforeEach(() => {
  catalog = createFakeCatalog();
  search = new SpotifyPlaylistSearch(asCatalogClient(catalog), createAppCredentials());
  vi.spyOn(logger, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SpotifyPlaylistSearch.searchPlaylists", () => {
  it("refuses a query shorter than two characters", async () => {
    await expect(search.searchPlaylists(ROOM_ID, " a ", 10)).resolves.toMatchObject({
      success: false,
      code: "invalid_query",
    });
  });

  it.each([
    `https://open.spotify.com/playlist/${PLAYLIST_ID}`,
    `spotify:playlist:${PLAYLIST_ID}`,
    PLAYLIST_ID,
  ])("opens %s directly instead of searching", async (query) => {
    const result = await search.searchPlaylists(ROOM_ID, query, 10);

    expect(catalog.getPlaylistSearchItem).toHaveBeenCalledWith(PLAYLIST_ID, TEST_APP_TOKEN);
    expect(catalog.searchPlaylists).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      query,
      playlists: [
        {
          id: PLAYLIST_ID,
          name: `Test Playlist ${PLAYLIST_ID}`,
          ownerName: "Test Owner",
          trackCount: 25,
        },
      ],
    });
  });

  it("names a playlist without an owner after Spotify and keeps its image", async () => {
    catalog.searchPlaylists.mockResolvedValueOnce([
      {
        ...spotifyPlaylist("p1", null),
        images: [{ url: "https://images.example.test/p1.jpg", width: null, height: null }],
      },
    ]);

    const result = await search.searchPlaylists(ROOM_ID, "80s", 1);

    expect(result.success && result.playlists).toEqual([
      {
        id: "p1",
        name: "Test Playlist p1",
        ownerName: "Spotify",
        trackCount: 25,
        imageUrl: "https://images.example.test/p1.jpg",
      },
    ]);
  });

  it("answers a Spotify failure with a client-safe message", async () => {
    catalog.searchPlaylists.mockRejectedValue(new SpotifyApiError("forbidden", "UPSTREAM", 403));

    await expect(search.searchPlaylists(ROOM_ID, "80s", 10)).resolves.toEqual({
      success: false,
      code: "spotify_api_error",
      message: "Spotify playlist search failed. Please try again.",
    });
  });
});

describe("SpotifyPlaylistSearch.searchUsablePlaylists", () => {
  it("skips empty pages and stops at four pages per query", async () => {
    catalog.searchPlaylists
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([spotifyPlaylist("p1")]);

    const playlists = await search.searchUsablePlaylists("80s", TEST_APP_TOKEN, 10);

    expect(playlists.map((playlist) => playlist.id)).toEqual(["p1"]);
    expect(catalog.searchPlaylists.mock.calls.map((call) => call.slice(2))).toEqual([
      [50, 0],
      [50, 50],
      [50, 100],
      [50, 150],
    ]);
  });

  it("retries a multi-word query as a phrase and drops duplicates", async () => {
    catalog.searchPlaylists.mockImplementation(async (query: string) =>
      query.startsWith('"')
        ? [spotifyPlaylist("p1"), spotifyPlaylist("p2")]
        : [spotifyPlaylist("p1")],
    );

    const playlists = await search.searchUsablePlaylists("summer hits", TEST_APP_TOKEN, 2);

    expect(playlists.map((playlist) => playlist.id)).toEqual(["p1", "p2"]);
    expect(catalog.searchPlaylists).toHaveBeenCalledWith('"summer hits"', TEST_APP_TOKEN, 50, 0);
  });

  it("does not quote a query that is already a phrase", async () => {
    await search.searchUsablePlaylists('"summer hits"', TEST_APP_TOKEN, 5);

    expect(new Set(catalog.searchPlaylists.mock.calls.map(([query]) => query))).toEqual(
      new Set(['"summer hits"']),
    );
  });

  it("stops as soon as the limit is reached and clamps the limit to one page", async () => {
    catalog.searchPlaylists.mockResolvedValue([spotifyPlaylist("p1"), spotifyPlaylist("p2")]);

    await expect(search.searchUsablePlaylists("80s", TEST_APP_TOKEN, 0)).resolves.toHaveLength(1);
    expect(catalog.searchPlaylists).toHaveBeenCalledTimes(1);
  });
});
