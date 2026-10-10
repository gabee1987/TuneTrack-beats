import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotifyCatalogClient } from "../../src/spotify/SpotifyCatalogClient.js";
import {
  spotifyAlbum,
  spotifyArtist,
  spotifyPlaylist,
  spotifyTrack,
} from "../support/fakeSpotifyCatalog.js";

const API = "http://127.0.0.1:3102/api";
const TOKEN = "TEST_APP_TOKEN";

function stubFetch(...bodies: Array<{ status?: number; body?: unknown }>) {
  const fetchMock = vi.fn();
  for (const { status = 200, body = {} } of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call]?.[0]));
}

const client = () => new SpotifyCatalogClient({ apiBaseUrl: API });

describe("SpotifyCatalogClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searches each type with the bearer token and drops malformed items", async () => {
    const fetchMock = stubFetch(
      { body: { tracks: { items: [spotifyTrack("t1", "1990"), null, { id: "broken" }] } } },
      { body: { albums: { items: [spotifyAlbum("a1", "1979"), null] } } },
      { body: { artists: { items: [null, spotifyArtist("r1")] } } },
      { body: { playlists: { items: [spotifyPlaylist("p1"), null, { id: "p2" }] } } },
    );

    const results = [
      await client().searchTracks("Test Song", TOKEN, 10, 20),
      await client().searchAlbums("Test Album", TOKEN, 10),
      await client().searchArtists("Test Artist", TOKEN, 10),
      await client().searchPlaylists("80s", TOKEN, 50),
    ];

    expect(results.map((items) => items.map((item) => item.id))).toEqual([
      ["t1"],
      ["a1"],
      ["r1"],
      ["p1"],
    ]);
    const trackSearch = requestedUrl(fetchMock);
    expect(trackSearch.pathname).toBe("/api/search");
    expect(Object.fromEntries(trackSearch.searchParams)).toEqual({
      q: "Test Song",
      type: "track",
      limit: "10",
      offset: "20",
    });
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ headers: { Authorization: `Bearer ${TOKEN}` } });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [429, "api_error"],
  ])("maps HTTP %i to %s", async (status, code) => {
    stubFetch({ status });

    await expect(client().searchTracks("Test Song", TOKEN, 10)).rejects.toMatchObject({
      name: "SpotifyApiError",
      code,
      statusCode: status,
    });
  });

  it("reads a playlist's name and metadata, rejecting malformed metadata", async () => {
    stubFetch({ body: { name: "Test Playlist" } }, { body: spotifyPlaylist("p1") }, { body: null });

    await expect(client().getPlaylistName("p1", TOKEN)).resolves.toBe("Test Playlist");
    await expect(client().getPlaylistSearchItem("p1", TOKEN)).resolves.toMatchObject({ id: "p1" });
    await expect(client().getPlaylistSearchItem("p1", TOKEN)).rejects.toMatchObject({
      code: "api_error",
    });
  });

  it("gives album tracks the album's name, date and artwork", async () => {
    stubFetch({
      body: {
        ...spotifyAlbum("a1", "1979-03-01"),
        images: [{ url: "https://images.example.test/a1.jpg", width: null, height: null }],
        tracks: {
          items: [
            {
              id: "t1",
              name: "Test Song",
              artists: [{ name: "Test Artist" }],
              preview_url: null,
              uri: "spotify:track:t1",
            },
            null,
            { id: "t2", name: "", artists: [], preview_url: null, uri: "spotify:track:t2" },
          ],
        },
      },
    });

    await expect(client().getAlbumTracks("a1", TOKEN)).resolves.toEqual([
      {
        id: "t1",
        name: "Test Song",
        artists: [{ name: "Test Artist" }],
        preview_url: null,
        uri: "spotify:track:t1",
        album: {
          name: "Test Album a1",
          release_date: "1979-03-01",
          images: [{ url: "https://images.example.test/a1.jpg", width: 0, height: 0 }],
        },
      },
    ]);
  });

  it("rejects a malformed album", async () => {
    stubFetch({ body: { id: "a1" } });

    await expect(client().getAlbumTracks("a1", TOKEN)).rejects.toMatchObject({ code: "api_error" });
  });

  it("reads an artist's top tracks for one market and drops malformed ones", async () => {
    const fetchMock = stubFetch({ body: { tracks: [spotifyTrack("t1", "2001"), null] } });

    await expect(client().getArtistTopTracks("r1", TOKEN)).resolves.toHaveLength(1);
    expect(requestedUrl(fetchMock).searchParams.get("market")).toBe("US");
  });

  it("follows playlist pages until Spotify reports no next page", async () => {
    const fetchMock = stubFetch(
      {
        body: {
          items: [{ track: spotifyTrack("t1", "1990") }, { track: null }],
          next: `${API}/playlists/p1/tracks?offset=100`,
          total: 2,
        },
      },
      { body: { items: [{ track: spotifyTrack("t2", "1991") }], next: null, total: 2 } },
    );

    const tracks = await client().getAllPlaylistTracks("p1", TOKEN);

    expect(tracks.map((track) => track.id)).toEqual(["t1", "t2"]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(`${API}/playlists/p1/tracks?offset=100`);
  });
});
