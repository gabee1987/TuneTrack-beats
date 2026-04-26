import { describe, expect, it } from "vitest";
import { extractSpotifyPlaylistId } from "../../src/spotify/spotifyUrlParser.js";

describe("extractSpotifyPlaylistId", () => {
  describe("https URL format", () => {
    it("extracts id from a bare playlist URL", () => {
      const result = extractSpotifyPlaylistId(
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      );

      expect(result).toBe("37i9dQZF1DXcBWIGoYBM5M");
    });

    it("extracts id from a URL with query params", () => {
      const result = extractSpotifyPlaylistId(
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123",
      );

      expect(result).toBe("37i9dQZF1DXcBWIGoYBM5M");
    });

    it("extracts id from a URL with a locale prefix", () => {
      const result = extractSpotifyPlaylistId(
        "https://open.spotify.com/playlist/5FjDHPksxBhfVEPZQsxOyh",
      );

      expect(result).toBe("5FjDHPksxBhfVEPZQsxOyh");
    });

    it("trims leading and trailing whitespace before parsing", () => {
      const result = extractSpotifyPlaylistId(
        "  https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M  ",
      );

      expect(result).toBe("37i9dQZF1DXcBWIGoYBM5M");
    });
  });

  describe("spotify: URI format", () => {
    it("extracts id from a spotify URI", () => {
      const result = extractSpotifyPlaylistId(
        "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
      );

      expect(result).toBe("37i9dQZF1DXcBWIGoYBM5M");
    });
  });

  describe("invalid inputs", () => {
    it("returns null for a random string", () => {
      expect(extractSpotifyPlaylistId("not-a-url")).toBeNull();
    });

    it("returns null for a Spotify track URL (not a playlist)", () => {
      expect(
        extractSpotifyPlaylistId(
          "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
        ),
      ).toBeNull();
    });

    it("returns null for a Spotify album URL", () => {
      expect(
        extractSpotifyPlaylistId(
          "https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC",
        ),
      ).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(extractSpotifyPlaylistId("")).toBeNull();
    });

    it("returns null for a non-Spotify URL", () => {
      expect(extractSpotifyPlaylistId("https://www.youtube.com/playlist?list=PLabc")).toBeNull();
    });
  });
});
