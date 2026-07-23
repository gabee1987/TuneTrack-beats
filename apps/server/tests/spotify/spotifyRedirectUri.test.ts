import { describe, expect, it } from "vitest";
import {
  parseSpotifyRedirectUris,
  resolveSpotifyRedirectUri,
} from "../../src/spotify/spotifyRedirectUri.js";

describe("spotifyRedirectUri", () => {
  it("parses comma-separated redirect URIs", () => {
    expect(
      parseSpotifyRedirectUris(
        "http://127.0.0.1:3001/api/spotify/callback, https://localhost:5173/api/spotify/callback",
      ),
    ).toEqual([
      "http://127.0.0.1:3001/api/spotify/callback",
      "https://localhost:5173/api/spotify/callback",
    ]);
  });

  it("resolves Vite-proxied callback for a configured client origin", () => {
    expect(resolveSpotifyRedirectUri("https://192.168.1.83:5173")).toBe(
      "https://192.168.1.83:5173/api/spotify/callback",
    );
  });

  it("falls back to the primary redirect URI for unknown origins", () => {
    expect(resolveSpotifyRedirectUri("https://unknown.example:5173")).toBe(
      "http://127.0.0.1:3001/api/spotify/callback",
    );
  });

  it("uses the primary redirect URI when client origin is omitted", () => {
    expect(resolveSpotifyRedirectUri(undefined)).toBe(
      "http://127.0.0.1:3001/api/spotify/callback",
    );
  });
});
