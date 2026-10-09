import { describe, expect, it } from "vitest";
import { buildSongKey, dedupeTracks } from "../../src/decks/trackDedupe.js";

function track(title: string, artist: string, spotifyTrackUri?: string) {
  return { title, artist, ...(spotifyTrackUri ? { spotifyTrackUri } : {}) };
}

describe("dedupeTracks", () => {
  it("keeps the first of two tracks with the same Spotify URI", () => {
    const result = dedupeTracks([
      track("Test Song", "Test Artist", "spotify:track:TEST1"),
      track("Edited Title", "Test Artist", "spotify:track:TEST1"),
    ]);

    expect(result.tracks.map((entry) => entry.title)).toEqual(["Test Song"]);
    expect(result.duplicateCount).toBe(1);
  });

  it("keeps one copy of a song released on an album and a compilation", () => {
    const result = dedupeTracks([
      track("Test Song", "Test Artist", "spotify:track:ALBUM1"),
      track("Test Song - Remastered 2011", "Test Artist", "spotify:track:COMPILATION1"),
      track("Test Song (Radio Edit)", "Test Artist, Guest Artist", "spotify:track:SINGLE1"),
    ]);

    expect(result.tracks).toHaveLength(1);
    expect(result.duplicateCount).toBe(2);
  });

  it("keeps different songs by the same artist", () => {
    const result = dedupeTracks([
      track("Test Song - Part 1", "Test Artist", "spotify:track:TEST1"),
      track("Test Song - Part 2", "Test Artist", "spotify:track:TEST2"),
      track("Another Song", "Test Artist", "spotify:track:TEST3"),
    ]);

    expect(result.tracks).toHaveLength(3);
  });

  it("matches tracks without a Spotify URI by title and artist", () => {
    const result = dedupeTracks([
      track("Test Song", "Test Artist"),
      track("test  song", "TEST ARTIST"),
    ]);

    expect(result.tracks).toHaveLength(1);
  });
});

describe("buildSongKey", () => {
  it("ignores case, diacritics, spacing and bracketed version notes", () => {
    expect(buildSongKey(track("  Été  Song [Mono] ", "Ártist"))).toBe(
      buildSongKey(track("ete song", "artist")),
    );
  });
});
