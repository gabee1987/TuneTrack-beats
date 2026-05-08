import { describe, expect, it } from "vitest";
import { RoomRegistry } from "../src/rooms/RoomRegistry.js";

describe("playlist metadata curation", () => {
  it("lets the host edit imported deck track metadata", () => {
    const roomRegistry = new RoomRegistry();
    roomRegistry.createRoom("playlist-room", "Host", "host-socket", "host-session");
    roomRegistry.setImportedDeck("host-socket", "playlist-room", [
      {
        id: "track-1",
        title: "Original Title",
        artist: "Original Artist",
        albumTitle: "Remastered Album",
        releaseYear: 2000,
        sourceReleaseYear: 2000,
        metadataStatus: "imported",
      },
    ]);

    roomRegistry.updateImportedDeckTrack("host-socket", {
      roomId: "playlist-room",
      trackId: "track-1",
      title: "Curated Title",
      artist: "Curated Artist",
      albumTitle: "Original Album",
      releaseYear: 1986,
    });

    expect(roomRegistry.getImportedDeck("playlist-room")).toEqual([
      expect.objectContaining({
        id: "track-1",
        title: "Curated Title",
        artist: "Curated Artist",
        albumTitle: "Original Album",
        releaseYear: 1986,
        sourceReleaseYear: 2000,
        metadataStatus: "edited",
      }),
    ]);
  });

  it("lets the host mark imported metadata verified without changing source year", () => {
    const roomRegistry = new RoomRegistry();
    roomRegistry.createRoom("verify-room", "Host", "host-socket", "host-session");
    roomRegistry.setImportedDeck("host-socket", "verify-room", [
      {
        id: "track-1",
        title: "Known Song",
        artist: "Known Artist",
        albumTitle: "Known Album",
        releaseYear: 1991,
      },
    ]);

    roomRegistry.updateImportedDeckTrack("host-socket", {
      roomId: "verify-room",
      trackId: "track-1",
      metadataStatus: "verified",
    });

    expect(roomRegistry.getImportedDeck("verify-room")).toEqual([
      expect.objectContaining({
        releaseYear: 1991,
        sourceReleaseYear: 1991,
        metadataStatus: "verified",
      }),
    ]);
  });

  it("rejects imported deck metadata edits from non-host players", () => {
    const roomRegistry = new RoomRegistry();
    roomRegistry.createRoom("protected-room", "Host", "host-socket", "host-session");
    roomRegistry.addPlayerToRoom("protected-room", "Guest", "guest-socket", "guest-session");
    roomRegistry.setImportedDeck("host-socket", "protected-room", [
      {
        id: "track-1",
        title: "Song",
        artist: "Artist",
        albumTitle: "Album",
        releaseYear: 2000,
      },
    ]);

    expect(() =>
      roomRegistry.updateImportedDeckTrack("guest-socket", {
        roomId: "protected-room",
        trackId: "track-1",
        releaseYear: 1986,
      }),
    ).toThrow("ONLY_HOST_CAN_EDIT_PLAYLIST");

    const deck = roomRegistry.getImportedDeck("protected-room");
    expect(deck?.[0]?.releaseYear).toBe(2000);
    expect(deck?.[0]?.metadataStatus).toBeUndefined();
  });
});
