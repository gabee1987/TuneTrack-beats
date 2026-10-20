import type { GameTrackCard } from "@tunetrack/game-engine";
import { describe, expect, it } from "vitest";
import {
  applyCandidateTrackEdits,
  filterCardsByYearRanges,
  interleaveCardGroups,
  selectBalancedByYear,
} from "../../src/spotify/candidateSelection.js";

function card(id: string, releaseYear: number): GameTrackCard {
  return {
    id,
    title: `Test Song ${id}`,
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear,
  };
}

const ids = (cards: GameTrackCard[]) => cards.map((item) => item.id);

describe("filterCardsByYearRanges", () => {
  const cards = [card("a", 1975), card("b", 1985), card("c", 1995)];

  it("keeps every card without ranges", () => {
    expect(filterCardsByYearRanges(cards)).toBe(cards);
    expect(filterCardsByYearRanges(cards, [])).toBe(cards);
  });

  it("keeps cards inside any range, both ends included", () => {
    const ranges = [
      { startYear: 1975, endYear: 1979 },
      { startYear: 1990, endYear: 1995 },
    ];

    expect(ids(filterCardsByYearRanges(cards, ranges))).toEqual(["a", "c"]);
  });
});

describe("selectBalancedByYear", () => {
  it("takes one card per year in year order before a second from any year", () => {
    const cards = [card("a1", 1990), card("a2", 1990), card("a3", 1990), card("b1", 1980)];

    expect(ids(selectBalancedByYear(cards, 3))).toEqual(["b1", "a1", "a2"]);
  });

  it("returns every card when the target exceeds the supply", () => {
    expect(ids(selectBalancedByYear([card("a", 1990), card("b", 1991)], 10))).toEqual(["a", "b"]);
  });

  it("returns nothing for a target of zero", () => {
    expect(selectBalancedByYear([card("a", 1990)], 0)).toEqual([]);
  });
});

describe("interleaveCardGroups", () => {
  it("alternates between groups and drains the longer one last", () => {
    const groups = [[card("a1", 1990), card("a2", 1990), card("a3", 1990)], [], [card("b1", 1980)]];

    expect(ids(interleaveCardGroups(groups))).toEqual(["a1", "b1", "a2", "a3"]);
    expect(groups[0]).toHaveLength(3);
  });
});

describe("applyCandidateTrackEdits", () => {
  const original: GameTrackCard = { ...card("a", 2011), spotifyTrackUri: "spotify:track:TEST1" };

  it("returns the card unchanged without an edit", () => {
    expect(applyCandidateTrackEdits(original)).toBe(original);
  });

  it("applies the host's edit and keeps Spotify's year as the source year", () => {
    const edited = applyCandidateTrackEdits(original, {
      id: "a",
      title: "Edited Song",
      artist: "Edited Artist",
      albumTitle: "Edited Album",
      releaseYear: 1979,
      metadataStatus: "edited",
      artworkUrl: "https://images.example.test/a.jpg",
    });

    expect(edited).toEqual({
      id: "a",
      title: "Edited Song",
      artist: "Edited Artist",
      albumTitle: "Edited Album",
      releaseYear: 1979,
      sourceReleaseYear: 2011,
      metadataStatus: "edited",
      artworkUrl: "https://images.example.test/a.jpg",
      spotifyTrackUri: "spotify:track:TEST1",
    });
  });

  it("keeps a source year the edit already carries", () => {
    const edited = applyCandidateTrackEdits(original, {
      id: "a",
      title: "Test Song",
      artist: "Test Artist",
      albumTitle: "Test Album",
      releaseYear: 1979,
      metadataStatus: "verified",
      sourceReleaseYear: 2001,
    });

    expect(edited.sourceReleaseYear).toBe(2001);
  });
});
