import { describe, expect, it } from "vitest";
import type { PublicTrackInfo } from "@tunetrack/shared";
import { getPlaylistTrackCurationFlags, shouldShowSourceYear } from "./playlistMetadataFlags";

function buildTrack(overrides: Partial<PublicTrackInfo> = {}): PublicTrackInfo {
  return {
    id: "track-1",
    title: "Song",
    artist: "Artist",
    albumTitle: "Album",
    releaseYear: 1986,
    sourceReleaseYear: 1986,
    metadataStatus: "imported",
    ...overrides,
  };
}

describe("playlistMetadataFlags", () => {
  it("flags imported tracks from likely reissue albums", () => {
    expect(
      getPlaylistTrackCurationFlags(buildTrack({ albumTitle: "Greatest Hits Remastered" })),
    ).toEqual(["suspicious_album"]);
  });

  it("does not flag edited or verified tracks", () => {
    expect(
      getPlaylistTrackCurationFlags(
        buildTrack({
          albumTitle: "Greatest Hits Remastered",
          metadataStatus: "verified",
        }),
      ),
    ).toEqual([]);
  });

  it("shows source year only when it differs from game year", () => {
    expect(shouldShowSourceYear(buildTrack({ releaseYear: 1986, sourceReleaseYear: 2000 }))).toBe(
      true,
    );
    expect(shouldShowSourceYear(buildTrack())).toBe(false);
  });
});
