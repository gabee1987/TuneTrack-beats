import type { PublicTrackInfo, SpotifySmartSearchResult } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import {
  appendUniqueSmartSearchResults,
  getQueuedSpotifyTrackIdsFromPlaylistTracks,
  getQueuedTrackIdsFromPlaylistTracks,
  getRemovableTrackIdsForSmartSearchResults,
  getSmartSearchQueueTrackId,
  getSpotifyTrackIdFromQueuedTrack,
  isSmartSearchResultQueued,
  mapSmartSearchResultToTrack,
} from "./spotifyQueueTrackIds";

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    id: "track-1",
    title: "Song",
    artist: "Artist",
    albumTitle: "Album",
    releaseYear: 2000,
    metadataStatus: "imported",
    ...overrides,
  };
}

function buildSmartSearchResult(
  overrides: Partial<SpotifySmartSearchResult> = {},
): SpotifySmartSearchResult {
  return {
    id: "abc123",
    type: "track",
    title: "Song",
    subtitle: "Artist",
    ...overrides,
  };
}

describe("getQueuedTrackIdsFromPlaylistTracks", () => {
  it("collects every track id into a set", () => {
    const tracks = [buildTrack({ id: "a" }), buildTrack({ id: "b" })];

    expect(getQueuedTrackIdsFromPlaylistTracks(tracks)).toEqual(new Set(["a", "b"]));
  });

  it("returns an empty set for an empty track list", () => {
    expect(getQueuedTrackIdsFromPlaylistTracks([])).toEqual(new Set());
  });
});

describe("getSpotifyTrackIdFromQueuedTrack", () => {
  it("prefers the Spotify track URI id", () => {
    expect(
      getSpotifyTrackIdFromQueuedTrack(
        buildTrack({
          id: "local-id",
          spotifyTrackUri: "spotify:track:abc123",
        }),
      ),
    ).toBe("abc123");
  });

  it("supports legacy smart-search prefixed ids", () => {
    expect(
      getSpotifyTrackIdFromQueuedTrack(buildTrack({ id: "spotify-search-abc123" })),
    ).toBe("abc123");
  });

  it("falls back to the track id", () => {
    expect(getSpotifyTrackIdFromQueuedTrack(buildTrack({ id: "abc123" }))).toBe("abc123");
  });
});

describe("getQueuedSpotifyTrackIdsFromPlaylistTracks", () => {
  it("extracts Spotify ids from playlist imports, smart search, and legacy ids", () => {
    const tracks = [
      buildTrack({ id: "spotify-search-legacy1" }),
      buildTrack({ id: "playlist-id", spotifyTrackUri: "spotify:track:fromUri" }),
      buildTrack({ id: "raw-spotify-id" }),
    ];

    expect(getQueuedSpotifyTrackIdsFromPlaylistTracks(tracks)).toEqual(
      new Set(["legacy1", "fromUri", "raw-spotify-id"]),
    );
  });
});

describe("getSmartSearchQueueTrackId", () => {
  it("uses the raw Spotify track id so search matches playlist imports", () => {
    expect(getSmartSearchQueueTrackId(buildSmartSearchResult({ id: "abc123" }))).toBe("abc123");
  });

  it("returns null for non-track results", () => {
    expect(getSmartSearchQueueTrackId(buildSmartSearchResult({ type: "album" }))).toBeNull();
    expect(getSmartSearchQueueTrackId(buildSmartSearchResult({ type: "artist" }))).toBeNull();
  });
});

describe("isSmartSearchResultQueued", () => {
  it("marks a track as queued when its Spotify id is present", () => {
    expect(
      isSmartSearchResultQueued(buildSmartSearchResult({ id: "abc123" }), new Set(["abc123"])),
    ).toBe(true);
  });

  it("ignores non-track results", () => {
    expect(
      isSmartSearchResultQueued(
        buildSmartSearchResult({ id: "abc123", type: "album" }),
        new Set(["abc123"]),
      ),
    ).toBe(false);
  });
});

describe("getRemovableTrackIdsForSmartSearchResults", () => {
  it("includes both current and legacy queue ids for removal", () => {
    expect(
      getRemovableTrackIdsForSmartSearchResults([buildSmartSearchResult({ id: "abc123" })]),
    ).toEqual(["abc123", "spotify-search-abc123"]);
  });
});

describe("appendUniqueSmartSearchResults", () => {
  it("appends new results while preserving existing order", () => {
    const current = [buildSmartSearchResult({ id: "1" }), buildSmartSearchResult({ id: "2" })];
    const incoming = [buildSmartSearchResult({ id: "3" })];

    expect(appendUniqueSmartSearchResults(current, incoming)).toEqual([...current, ...incoming]);
  });

  it("dedupes results sharing the same type and id", () => {
    const current = [buildSmartSearchResult({ id: "1", type: "track" })];
    const incoming = [
      buildSmartSearchResult({ id: "1", type: "track" }),
      buildSmartSearchResult({ id: "2", type: "track" }),
    ];

    expect(appendUniqueSmartSearchResults(current, incoming)).toEqual([
      buildSmartSearchResult({ id: "1", type: "track" }),
      buildSmartSearchResult({ id: "2", type: "track" }),
    ]);
  });

  it("treats results with the same id but different type as distinct", () => {
    const current = [buildSmartSearchResult({ id: "1", type: "track" })];
    const incoming = [buildSmartSearchResult({ id: "1", type: "album" })];

    expect(appendUniqueSmartSearchResults(current, incoming)).toEqual([
      buildSmartSearchResult({ id: "1", type: "track" }),
      buildSmartSearchResult({ id: "1", type: "album" }),
    ]);
  });
});

describe("mapSmartSearchResultToTrack", () => {
  it("maps a track result into a queueable track with the Spotify track id", () => {
    const result = buildSmartSearchResult({
      id: "abc123",
      type: "track",
      title: "Song",
      subtitle: "Artist",
      artist: "Artist",
      albumTitle: "Album",
      releaseYear: 1999,
      spotifyUri: "spotify:track:abc123",
      imageUrl: "https://example.com/art.png",
      previewUrl: "https://example.com/preview.mp3",
    });

    expect(mapSmartSearchResultToTrack(result)).toEqual([
      {
        id: "abc123",
        title: "Song",
        artist: "Artist",
        albumTitle: "Album",
        releaseYear: 1999,
        sourceReleaseYear: 1999,
        metadataStatus: "imported",
        spotifyTrackUri: "spotify:track:abc123",
        artworkUrl: "https://example.com/art.png",
        previewUrl: "https://example.com/preview.mp3",
      },
    ]);
  });

  it("falls back to the subtitle and title when artist/album metadata is missing", () => {
    const result = buildSmartSearchResult({
      id: "abc123",
      type: "track",
      title: "Song",
      subtitle: "Fallback Artist",
      spotifyUri: "spotify:track:abc123",
      releaseYear: 2010,
    });

    const [track] = mapSmartSearchResultToTrack(result);

    expect(track).toMatchObject({ artist: "Fallback Artist", albumTitle: "Song" });
  });

  it("returns an empty list for playlist/album/artist shapes without a spotify uri", () => {
    expect(mapSmartSearchResultToTrack(buildSmartSearchResult({ type: "playlist" }))).toEqual([]);
    expect(mapSmartSearchResultToTrack(buildSmartSearchResult({ type: "track" }))).toEqual([]);
  });
});
