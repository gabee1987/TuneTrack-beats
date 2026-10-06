import { describe, expect, it } from "vitest";
import { createRoomPayloadSchema, loadCuratedPlaylistPayloadSchema } from "./schemas.js";

describe("createRoomPayloadSchema", () => {
  it("accepts server-generated creation without a room id", () => {
    expect(
      createRoomPayloadSchema.parse({
        displayName: "Player One",
        sessionId: "TEST_SESSION_1",
      }),
    ).toEqual({
      displayName: "Player One",
      sessionId: "TEST_SESSION_1",
    });
  });

  it("continues accepting a valid custom room id", () => {
    expect(
      createRoomPayloadSchema.parse({
        displayName: "Player One",
        roomId: "custom-room",
        sessionId: "TEST_SESSION_1",
      }).roomId,
    ).toBe("custom-room");
  });
});

describe("curated playlist track media URLs", () => {
  function parseTrackWith(mediaUrls: { artworkUrl?: string; previewUrl?: string }) {
    return loadCuratedPlaylistPayloadSchema.safeParse({
      roomId: "TEST_ROOM_1",
      tracks: [
        {
          id: "track-12345",
          title: "Test Song",
          artist: "Test Artist",
          albumTitle: "Test Album",
          releaseYear: 1990,
          ...mediaUrls,
        },
      ],
    });
  }

  it("accepts https artwork and preview URLs", () => {
    expect(
      parseTrackWith({
        artworkUrl: "https://images.example.test/artwork.jpg",
        previewUrl: "https://audio.example.test/preview.mp3",
      }).success,
    ).toBe(true);
  });

  for (const unsafeUrl of [
    "javascript:alert(1)",
    "http://images.example.test/artwork.jpg",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "file:///etc/passwd",
  ]) {
    it(`rejects ${unsafeUrl.split(":")[0]}: as artwork or preview URL`, () => {
      expect(parseTrackWith({ artworkUrl: unsafeUrl }).success).toBe(false);
      expect(parseTrackWith({ previewUrl: unsafeUrl }).success).toBe(false);
    });
  }
});
