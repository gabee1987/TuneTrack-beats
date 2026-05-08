import { describe, expect, it } from "vitest";
import {
  deleteSavedPlaylist,
  listSavedPlaylists,
  savePlaylist,
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
