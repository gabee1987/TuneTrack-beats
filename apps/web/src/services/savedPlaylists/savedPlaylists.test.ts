import { describe, expect, it } from "vitest";
import {
  deleteSavedPlaylist,
  listSavedPlaylists,
  savePlaylist,
  updateSavedPlaylist,
  type StorageLike,
} from "./savedPlaylists";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("savedPlaylists", () => {
  it("saves curated track metadata and playback identifiers", () => {
    const storage = new MemoryStorage();

    const savedPlaylist = savePlaylist(
      {
        name: "Rock night",
        tracks: [
          {
            id: "track-1",
            title: "Song",
            artist: "Artist",
            albumTitle: "Album",
            releaseYear: 1986,
            sourceReleaseYear: 2000,
            metadataStatus: "edited",
            previewUrl: "https://example.com/preview.mp3",
            spotifyTrackUri: "spotify:track:track-1",
          },
        ],
      },
      storage,
    );

    expect(savedPlaylist).toEqual(
      expect.objectContaining({
        name: "Rock night",
        tracks: [
          expect.objectContaining({
            releaseYear: 1986,
            sourceReleaseYear: 2000,
            metadataStatus: "edited",
            previewUrl: "https://example.com/preview.mp3",
            spotifyTrackUri: "spotify:track:track-1",
          }),
        ],
      }),
    );
    expect(listSavedPlaylists(storage)).toHaveLength(1);
  });

  it("deletes a saved playlist without touching the others", () => {
    const storage = new MemoryStorage();
    const first = savePlaylist(
      {
        name: "First",
        tracks: [createTrack("track-1")],
      },
      storage,
    );
    const second = savePlaylist(
      {
        name: "Second",
        tracks: [createTrack("track-2")],
      },
      storage,
    );

    const remaining = deleteSavedPlaylist(first?.id ?? "", storage);

    expect(remaining).toEqual([expect.objectContaining({ id: second?.id })]);
  });

  it("reads a deck saved before covers existed without losing anything", () => {
    const storage = new MemoryStorage();
    const savedBeforeCovers = {
      id: "TEST_DECK_1",
      name: "Test Deck",
      source: "spotify",
      sourcePlaylistUrl: "https://open.spotify.com/playlist/TESTPLAYLIST1234567890",
      createdAtEpochMs: 1,
      updatedAtEpochMs: 2,
      tracks: [{ ...createTrack("track-1"), sourceReleaseYear: 2011, metadataStatus: "verified" }],
    };
    storage.setItem(
      "tunetrack.savedPlaylists.v1",
      JSON.stringify({ playlists: [savedBeforeCovers] }),
    );

    expect(listSavedPlaylists(storage)).toEqual([savedBeforeCovers]);
  });

  it("keeps the cover and the deck's other details when its songs are written back", () => {
    const storage = new MemoryStorage();
    const deck = savePlaylist(
      {
        imageUrl: "https://example.com/cover.jpg",
        name: "Covered",
        tracks: [createTrack("track-1")],
      },
      storage,
    );

    const [written] = updateSavedPlaylist(
      deck?.id ?? "",
      [{ ...createTrack("track-1"), releaseYear: 1979, metadataStatus: "verified" }],
      storage,
    );

    expect(written).toEqual(
      expect.objectContaining({
        imageUrl: "https://example.com/cover.jpg",
        name: "Covered",
        tracks: [expect.objectContaining({ metadataStatus: "verified", releaseYear: 1979 })],
      }),
    );
  });

  it("keeps the 20 newest decks", () => {
    const storage = new MemoryStorage();
    for (let index = 1; index <= 21; index++) {
      savePlaylist({ name: `Deck ${index}`, tracks: [createTrack("track-1")] }, storage);
    }

    const decks = listSavedPlaylists(storage);
    expect(decks).toHaveLength(20);
    expect(decks[0]?.name).toBe("Deck 21");
    expect(decks.some((deck) => deck.name === "Deck 1")).toBe(false);
  });
});

function createTrack(id: string) {
  return {
    id,
    title: "Song",
    artist: "Artist",
    albumTitle: "Album",
    releaseYear: 1990,
    metadataStatus: "imported" as const,
  };
}
