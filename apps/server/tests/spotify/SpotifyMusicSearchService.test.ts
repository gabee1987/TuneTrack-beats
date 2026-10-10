import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import { SpotifyApiError } from "../../src/spotify/spotifyApiTypes.js";
import { SpotifyMusicSearchService } from "../../src/spotify/SpotifyMusicSearchService.js";
import {
  asCatalogClient,
  createAppCredentials,
  createFakeCatalog,
  spotifyAlbum,
  spotifyArtist,
  spotifyTrack,
  TEST_APP_TOKEN,
  type FakeCatalog,
} from "../support/fakeSpotifyCatalog.js";

const ROOM_ID = "TEST_ROOM_1";
const ALL_TYPES = ["track", "album", "artist"] as const;

let catalog: FakeCatalog;
let service: SpotifyMusicSearchService;

beforeEach(() => {
  catalog = createFakeCatalog();
  service = new SpotifyMusicSearchService(asCatalogClient(catalog), createAppCredentials());
  vi.spyOn(logger, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SpotifyMusicSearchService.search", () => {
  it("refuses a query shorter than two characters without calling Spotify", async () => {
    const result = await service.search(ROOM_ID, "a", 10, 0, [...ALL_TYPES]);

    expect(result).toMatchObject({ success: false, code: "invalid_query" });
    expect(catalog.searchTracks).not.toHaveBeenCalled();
  });

  it("maps tracks, albums and artists in that order", async () => {
    catalog.searchTracks.mockResolvedValue([
      spotifyTrack("t1", "1985-06-01", {
        artists: [{ name: "Test Artist" }, { name: "Guest Artist" }],
        preview_url: "https://previews.example.test/t1.mp3",
      }),
    ]);
    catalog.searchAlbums.mockResolvedValue([spotifyAlbum("a1", "1979")]);
    catalog.searchArtists.mockResolvedValue([spotifyArtist("r1")]);

    const result = await service.search(ROOM_ID, "Test Artist", 10, 0, [...ALL_TYPES]);

    expect(result.success && result.results).toEqual([
      {
        id: "t1",
        type: "track",
        title: "Test Song t1",
        subtitle: "Test Artist, Guest Artist · 1985",
        artist: "Test Artist, Guest Artist",
        albumTitle: "Test Album",
        releaseYear: 1985,
        previewUrl: "https://previews.example.test/t1.mp3",
        spotifyUri: "spotify:track:t1",
        imageUrl: "https://images.example.test/t1.jpg",
      },
      {
        id: "a1",
        type: "album",
        title: "Test Album a1",
        subtitle: "Test Artist, Guest Artist · 1979",
        artist: "Test Artist, Guest Artist",
        trackCount: 12,
        releaseYear: 1979,
        spotifyUri: "spotify:album:a1",
      },
      {
        id: "r1",
        type: "artist",
        title: "Test Artist r1",
        subtitle: "Artist",
        spotifyUri: "spotify:artist:r1",
        imageUrl: "https://images.example.test/r1.jpg",
      },
    ]);
    expect(catalog.searchTracks).toHaveBeenCalledWith("Test Artist", TEST_APP_TOKEN, 10, 0);
  });

  it("shows the album name for a track without a readable year", async () => {
    catalog.searchTracks.mockResolvedValue([spotifyTrack("t1", "unknown")]);

    const result = await service.search(ROOM_ID, "Test Song", 10, 0, ["track"]);

    expect(result.success && result.results[0]).toMatchObject({
      subtitle: "Test Artist · Test Album",
    });
    expect(result.success && result.results[0]).not.toHaveProperty("releaseYear");
  });

  it("asks only for the requested types", async () => {
    await service.search(ROOM_ID, "Test Artist", 10, 0, ["album"]);

    expect(catalog.searchTracks).not.toHaveBeenCalled();
    expect(catalog.searchAlbums).toHaveBeenCalledTimes(1);
    expect(catalog.searchArtists).not.toHaveBeenCalled();
  });

  it("adds the year to the track query and drops tracks from other years", async () => {
    catalog.searchTracks.mockResolvedValue([
      spotifyTrack("t1985", "1985-01-01"),
      spotifyTrack("t1986", "1986-01-01"),
    ]);

    const result = await service.search(ROOM_ID, "Test Song 1985", 10, 0, ["track", "album"]);

    expect(catalog.searchTracks).toHaveBeenCalledWith("Test Song year:1985", TEST_APP_TOKEN, 10, 0);
    expect(catalog.searchAlbums).toHaveBeenCalledWith("Test Song", TEST_APP_TOKEN, 10, 0);
    expect(result.success && result.results.map((item) => item.id)).toEqual(["t1985"]);
  });

  it("caps each type at 20, reports more when a type filled its page, and trims to the limit", async () => {
    catalog.searchTracks.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => spotifyTrack(`t${index}`, "1990")),
    );

    const result = await service.search(ROOM_ID, "Test Song", 30, 40, ["track"]);

    expect(catalog.searchTracks).toHaveBeenCalledWith("Test Song", TEST_APP_TOKEN, 20, 40);
    expect(result).toMatchObject({ success: true, hasMore: true, nextOffset: 60, offset: 40 });
    expect(result.success && result.results).toHaveLength(20);

    const trimmed = await service.search(ROOM_ID, "Test Song", 5, 0, ["track"]);
    expect(trimmed).toMatchObject({ success: true, hasMore: true, nextOffset: 5 });
    expect(trimmed.success && trimmed.results).toHaveLength(5);
  });

  it("answers a playlist link with that playlist only", async () => {
    catalog.getPlaylistSearchItem.mockResolvedValue({
      id: "TESTPLAYLIST12345",
      name: "Test Playlist",
      owner: { display_name: null },
      images: [{ url: "https://images.example.test/p.jpg", width: null, height: null }],
      tracks: { total: 25 },
    });

    const result = await service.search(ROOM_ID, "spotify:playlist:TESTPLAYLIST12345", 10, 0, [
      ...ALL_TYPES,
    ]);

    expect(result).toMatchObject({
      success: true,
      hasMore: false,
      results: [
        {
          id: "TESTPLAYLIST12345",
          type: "playlist",
          subtitle: "Spotify · 25 tracks",
          ownerName: "Spotify",
          trackCount: 25,
          imageUrl: "https://images.example.test/p.jpg",
        },
      ],
    });
    expect(result).not.toHaveProperty("nextOffset");
    expect(catalog.searchTracks).not.toHaveBeenCalled();
  });

  it("answers a Spotify failure with a client-safe message", async () => {
    catalog.searchTracks.mockRejectedValue(new SpotifyApiError("api_error", "UPSTREAM_DETAIL"));

    const result = await service.search(ROOM_ID, "Test Song", 10, 0, ["track"]);

    expect(result).toEqual({
      success: false,
      code: "spotify_api_error",
      message: "Spotify search failed. Please try again.",
    });
  });
});

describe("SpotifyMusicSearchService.getPlaylistDetail", () => {
  it("refuses a blank playlist id", async () => {
    await expect(service.getPlaylistDetail(ROOM_ID, "  ")).resolves.toMatchObject({
      success: false,
      code: "invalid_playlist",
    });
  });

  it("maps a playlist, counting unusable and duplicate tracks as filtered", async () => {
    catalog.getAllPlaylistTracks.mockResolvedValue([
      spotifyTrack("t1", "1985-01-01"),
      spotifyTrack("t1", "1985-01-01"),
      spotifyTrack("t2", "not-a-year"),
      spotifyTrack("t3", "1990"),
    ]);

    const result = await service.getPlaylistDetail(ROOM_ID, " TESTPLAYLIST12345 ");

    expect(result).toMatchObject({
      success: true,
      playlistId: "TESTPLAYLIST12345",
      sourceType: "playlist",
      title: "Test Playlist TESTPLAYLIST12345",
      subtitle: "Test Owner · 25 tracks",
      totalFetched: 4,
      filteredCount: 2,
    });
    expect(result.success && result.tracks.map((track) => track.id)).toEqual(["t1", "t3"]);
    expect(result.success && result.tracks[0]?.metadataStatus).toBe("imported");
  });

  it("titles an album after its first track's album", async () => {
    catalog.getAlbumTracks.mockResolvedValue([
      spotifyTrack("t1", "1979"),
      spotifyTrack("t2", "1979"),
    ]);

    const result = await service.getPlaylistDetail(ROOM_ID, "TESTALBUM1", "album");

    expect(result).toMatchObject({
      success: true,
      sourceType: "album",
      title: "Test Album",
      subtitle: "2 tracks",
      imageUrl: "https://images.example.test/t1.jpg",
    });
  });

  it("names an empty album and artist source generically", async () => {
    await expect(service.getPlaylistDetail(ROOM_ID, "TESTALBUM1", "album")).resolves.toMatchObject({
      title: "Spotify album",
      subtitle: "0 tracks",
    });
    await expect(
      service.getPlaylistDetail(ROOM_ID, "TESTARTIST1", "artist"),
    ).resolves.toMatchObject({ title: "Spotify artist", subtitle: "0 top tracks" });
  });

  it("titles an artist source after the artist of its top tracks", async () => {
    catalog.getArtistTopTracks.mockResolvedValue([spotifyTrack("t1", "2001")]);

    await expect(
      service.getPlaylistDetail(ROOM_ID, "TESTARTIST1", "artist"),
    ).resolves.toMatchObject({
      success: true,
      title: "Test Artist",
      subtitle: "1 top tracks",
      imageUrl: "https://images.example.test/t1.jpg",
    });
  });

  it("answers a Spotify failure with a client-safe message", async () => {
    catalog.getAllPlaylistTracks.mockRejectedValue(new Error("UPSTREAM_DETAIL"));

    await expect(service.getPlaylistDetail(ROOM_ID, "TESTPLAYLIST12345")).resolves.toEqual({
      success: false,
      code: "spotify_api_error",
      message: "Spotify playlist could not be opened. Please try again.",
    });
  });
});
