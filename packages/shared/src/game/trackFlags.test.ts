import { describe, expect, it } from "vitest";
import type { TrackCardPublic } from "./track.js";
import { countTracksToCheck, getTrackCurationFlags, shouldShowSourceYear } from "./trackFlags.js";

function buildTrack(overrides: Partial<TrackCardPublic> = {}): TrackCardPublic {
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

describe("trackFlags", () => {
  it("flags imported tracks from likely reissue albums", () => {
    expect(getTrackCurationFlags(buildTrack({ albumTitle: "Greatest Hits Remastered" }))).toEqual([
      "suspicious_album",
    ]);
  });

  it("does not flag edited, verified or status-less tracks", () => {
    for (const metadataStatus of ["edited", "verified"] as const) {
      expect(
        getTrackCurationFlags(
          buildTrack({ albumTitle: "Greatest Hits Remastered", metadataStatus }),
        ),
      ).toEqual([]);
    }
    expect(getTrackCurationFlags({ albumTitle: "Greatest Hits Remastered" })).toEqual([]);
  });

  it("counts only the tracks that still need a year check", () => {
    expect(
      countTracksToCheck([
        buildTrack({ albumTitle: "Live at Placeholder Hall" }),
        buildTrack({ albumTitle: "Deluxe Edition", metadataStatus: "verified" }),
        buildTrack({ albumTitle: "Best Of" }),
        buildTrack(),
      ]),
    ).toBe(2);
    expect(countTracksToCheck([])).toBe(0);
  });

  it("shows the source year only when it differs from the game year", () => {
    expect(shouldShowSourceYear(buildTrack({ releaseYear: 1986, sourceReleaseYear: 2000 }))).toBe(
      true,
    );
    expect(shouldShowSourceYear(buildTrack())).toBe(false);
  });
});
