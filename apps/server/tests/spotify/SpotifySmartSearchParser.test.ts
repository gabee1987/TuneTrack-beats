import { describe, expect, it } from "vitest";
import { parseSpotifySmartSearchQuery } from "../../src/spotify/SpotifySmartSearchParser.js";

describe("parseSpotifySmartSearchQuery", () => {
  it.each(["", " ", "a", " a "])("rejects %j as too short", (query) => {
    expect(parseSpotifySmartSearchQuery(query)).toBeNull();
  });

  it.each([
    "https://open.spotify.com/playlist/TESTPLAYLIST12345?si=abc",
    "spotify:playlist:TESTPLAYLIST12345",
  ])("reads %s as a playlist link", (query) => {
    expect(parseSpotifySmartSearchQuery(`  ${query}  `)).toEqual({
      rawQuery: query,
      normalizedQuery: query.toLocaleLowerCase(),
      kind: "playlist_url",
      playlistId: "TESTPLAYLIST12345",
      queryWithoutQualifiers: query,
    });
  });

  it("keeps plain text as a mixed search without qualifiers", () => {
    expect(parseSpotifySmartSearchQuery("Test Artist")).toEqual({
      rawQuery: "Test Artist",
      normalizedQuery: "test artist",
      kind: "mixed_search",
      queryWithoutQualifiers: "Test Artist",
    });
  });

  it("lifts a year and an owner hint out of the query", () => {
    expect(parseSpotifySmartSearchQuery("Test  Song 1985 owner:TEST_OWNER")).toMatchObject({
      kind: "mixed_search",
      year: 1985,
      ownerHint: "TEST_OWNER",
      queryWithoutQualifiers: "Test Song",
    });
  });

  it.each([
    ["1899 hits", undefined],
    ["2099 hits", 2099],
    ["hits of 19855", undefined],
  ])("reads the year in %j as %s", (query, year) => {
    expect(parseSpotifySmartSearchQuery(query)?.year).toBe(year);
  });

  it("falls back to the raw query when only qualifiers were typed", () => {
    expect(parseSpotifySmartSearchQuery("1985")?.queryWithoutQualifiers).toBe("1985");
  });
});
