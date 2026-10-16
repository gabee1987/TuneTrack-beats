import { describe, expect, it } from "vitest";
import type { SavedPlaylist } from "../../../../services/savedPlaylists/savedPlaylists";
import {
  clampQuickPickSongs,
  getDefaultMusicTab,
  getMusicPlaybackState,
  isPlaylistLink,
  summarizeSavedDeck,
} from "./musicSetupSelectors";

function buildDeck(tracks: Partial<SavedPlaylist["tracks"][number]>[]): SavedPlaylist {
  return {
    createdAtEpochMs: 1,
    id: "TEST_DECK_1",
    name: "Test Deck",
    source: "spotify",
    tracks: tracks.map((track, index) => ({
      albumTitle: "Album One",
      artist: "Artist One",
      id: `TEST_TRACK_${index}`,
      metadataStatus: "imported",
      releaseYear: 1990,
      title: `Song ${index}`,
      ...track,
    })),
    updatedAtEpochMs: 1,
  };
}

describe("musicSetupSelectors", () => {
  it("opens on Your decks only when a saved deck exists", () => {
    expect(getDefaultMusicTab(0)).toBe("find");
    expect(getDefaultMusicTab(2)).toBe("decks");
  });

  it.each([
    ["spotify:playlist:TESTPLAYLIST1234567890", true],
    ["https://open.spotify.com/playlist/TESTPLAYLIST1234567890?si=1", true],
    ["TESTPLAYLIST1234567890", true],
    ["  ", false],
    ["eighties pop", false],
    ["https://open.spotify.com/album/TESTALBUM", false],
  ])("treats %j as a playlist link: %s", (value, expected) => {
    expect(isPlaylistLink(value)).toBe(expected);
  });

  it("sums up a saved deck with up to four distinct covers and the years to check", () => {
    const summary = summarizeSavedDeck(
      buildDeck([
        { artworkUrl: "https://example.test/a.jpg" },
        { artworkUrl: "https://example.test/a.jpg", albumTitle: "Greatest Hits" },
        { artworkUrl: "https://example.test/b.jpg" },
        { artworkUrl: "https://example.test/c.jpg", metadataStatus: "verified" },
        { artworkUrl: "https://example.test/d.jpg", albumTitle: "Live at the Hall" },
        { artworkUrl: "https://example.test/e.jpg" },
      ]),
    );

    expect(summary).toEqual({
      coverUrls: [
        "https://example.test/a.jpg",
        "https://example.test/b.jpg",
        "https://example.test/c.jpg",
        "https://example.test/d.jpg",
      ],
      id: "TEST_DECK_1",
      name: "Test Deck",
      songCount: 6,
      toCheckCount: 2,
    });
  });

  it("reads playback from the login in progress first, then the room", () => {
    const connected = { spotifyAccountType: "premium", spotifyAuthStatus: "connected" } as const;
    const idle = { accountType: null, authPhase: "idle" } as const;

    expect(getMusicPlaybackState(connected, { ...idle, authPhase: "connecting" })).toBe(
      "connecting",
    );
    expect(getMusicPlaybackState(connected, { ...idle, authPhase: "error" })).toBe("error");
    expect(
      getMusicPlaybackState({ spotifyAccountType: null, spotifyAuthStatus: "none" }, idle),
    ).toBe("none");
    expect(getMusicPlaybackState(connected, idle)).toBe("premium");
    expect(getMusicPlaybackState(connected, { ...idle, accountType: "free" })).toBe("free");
  });

  it("keeps the quick-pick size between 10 and 500", () => {
    expect(clampQuickPickSongs(3)).toBe(10);
    expect(clampQuickPickSongs(120.4)).toBe(120);
    expect(clampQuickPickSongs(900)).toBe(500);
  });
});
