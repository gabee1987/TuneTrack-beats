import { describe, expect, it } from "vitest";
import { resolveArtworkUrl } from "./resolveArtworkUrl";

function decodeCover(url: string | undefined): string {
  return decodeURIComponent(url?.replace("data:image/svg+xml,", "") ?? "");
}

describe("resolveArtworkUrl", () => {
  it("passes real artwork through untouched", () => {
    const card = {
      artist: "Test Artist",
      artworkUrl: "https://images.example.test/a.jpg",
      title: "Test Song",
    };

    expect(resolveArtworkUrl(card)).toBe("https://images.example.test/a.jpg");
    expect(resolveArtworkUrl({ artist: "Test Artist", title: "Test Song" })).toBeUndefined();
  });

  it("draws a practice cover with the lead artist's initials and never the year", () => {
    const url = resolveArtworkUrl({
      artist: "The Test Band feat. Guest Singer",
      artworkUrl: "/practice-covers/track-001.svg",
      title: "Test Song 1999",
    });

    expect(url).toMatch(/^data:image\/svg\+xml,/);
    expect(decodeCover(url)).toContain(">TB</text>");
    expect(decodeCover(url)).not.toContain("1999");
  });

  it("returns the same cover for the same card and a different one for another card", () => {
    const first = {
      artist: "Artist One",
      artworkUrl: "/practice-covers/track-001.svg",
      title: "Song One",
    };
    const second = {
      artist: "Artist Two",
      artworkUrl: "/practice-covers/track-002.svg",
      title: "Song Two",
    };

    expect(resolveArtworkUrl(first)).toBe(resolveArtworkUrl({ ...first }));
    expect(resolveArtworkUrl(first)).not.toBe(resolveArtworkUrl(second));
  });
});
