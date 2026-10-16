import { describe, expect, it } from "vitest";
import { applyTrackEdit } from "./trackEdits.js";

const track = {
  albumTitle: "Test Album (Remastered)",
  artist: "Test Artist",
  id: "TEST_TRACK_1",
  metadataStatus: "imported" as const,
  releaseYear: 2011,
  title: "Test Song",
};

describe("applyTrackEdit", () => {
  it("marks a changed song edited and keeps the year Spotify reported", () => {
    expect(applyTrackEdit(track, { releaseYear: 1984 })).toEqual({
      ...track,
      metadataStatus: "edited",
      releaseYear: 1984,
      sourceReleaseYear: 2011,
    });
  });

  it("keeps the status the host chose, and leaves an untouched song as it was", () => {
    expect(applyTrackEdit(track, { metadataStatus: "verified", title: "New Title" })).toMatchObject(
      { metadataStatus: "verified", title: "New Title" },
    );
    expect(applyTrackEdit(track, {}).metadataStatus).toBe("imported");
  });
});
