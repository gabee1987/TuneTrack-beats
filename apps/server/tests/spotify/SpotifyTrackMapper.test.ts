import { describe, expect, it } from "vitest";
import { mapSpotifyTrackToGameCard } from "../../src/spotify/SpotifyTrackMapper.js";
import type { SpotifyApiTrack } from "../../src/spotify/SpotifyApiClient.js";

function buildTrack(overrides: Partial<SpotifyApiTrack> = {}): SpotifyApiTrack {
  return {
    id: "track-abc123",
    name: "Bohemian Rhapsody",
    artists: [{ name: "Queen" }],
    album: {
      name: "A Night at the Opera",
      release_date: "1975-11-21",
      images: [
        { url: "https://example.com/large.jpg", width: 640, height: 640 },
        { url: "https://example.com/small.jpg", width: 64, height: 64 },
      ],
    },
    preview_url: "https://p.scdn.co/mp3-preview/abc123",
    uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    ...overrides,
  };
}

describe("mapSpotifyTrackToGameCard", () => {
  it("maps a fully-populated track correctly", () => {
    const result = mapSpotifyTrackToGameCard(buildTrack());

    expect(result).toEqual({
      id: "track-abc123",
      title: "Bohemian Rhapsody",
      artist: "Queen",
      albumTitle: "A Night at the Opera",
      releaseYear: 1975,
      artworkUrl: "https://example.com/large.jpg",
      previewUrl: "https://p.scdn.co/mp3-preview/abc123",
      spotifyTrackUri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    });
  });

  it("extracts release year from a year-only release_date string", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({ album: { ...buildTrack().album, release_date: "1975" } }),
    );

    expect(result?.releaseYear).toBe(1975);
  });

  it("selects the largest artwork image", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({
        album: {
          ...buildTrack().album,
          images: [
            { url: "https://example.com/small.jpg", width: 64, height: 64 },
            { url: "https://example.com/large.jpg", width: 640, height: 640 },
            { url: "https://example.com/medium.jpg", width: 300, height: 300 },
          ],
        },
      }),
    );

    expect(result?.artworkUrl).toBe("https://example.com/large.jpg");
  });

  it("omits artworkUrl when no images are present", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({ album: { ...buildTrack().album, images: [] } }),
    );

    expect(result).not.toBeNull();
    expect(result?.artworkUrl).toBeUndefined();
  });

  it("omits previewUrl when preview_url is null", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({ preview_url: null }),
    );

    expect(result).not.toBeNull();
    expect(result?.previewUrl).toBeUndefined();
  });

  it("returns null when track id is missing", () => {
    const result = mapSpotifyTrackToGameCard(buildTrack({ id: "" }));

    expect(result).toBeNull();
  });

  it("returns null when track name is missing", () => {
    const result = mapSpotifyTrackToGameCard(buildTrack({ name: "" }));

    expect(result).toBeNull();
  });

  it("returns null when artists array is empty", () => {
    const result = mapSpotifyTrackToGameCard(buildTrack({ artists: [] }));

    expect(result).toBeNull();
  });

  it("returns null when release_date is missing", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({ album: { ...buildTrack().album, release_date: "" } }),
    );

    expect(result).toBeNull();
  });

  it("returns null when release_date is not a valid year", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({ album: { ...buildTrack().album, release_date: "not-a-date" } }),
    );

    expect(result).toBeNull();
  });

  it("uses only the first artist when multiple artists are present", () => {
    const result = mapSpotifyTrackToGameCard(
      buildTrack({ artists: [{ name: "Freddie Mercury" }, { name: "David Bowie" }] }),
    );

    expect(result?.artist).toBe("Freddie Mercury");
  });
});
