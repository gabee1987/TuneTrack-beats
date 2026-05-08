import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlaylistImportService } from "../../src/decks/PlaylistImportService.js";
import type { SpotifyApiClient, SpotifyApiTrack } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyApiError } from "../../src/spotify/SpotifyApiClient.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

function buildApiTrack(id: string, year = "1975"): SpotifyApiTrack {
  return {
    id,
    name: `Track ${id}`,
    artists: [{ name: "Artist" }],
    album: {
      name: "Album",
      release_date: year,
      images: [{ url: "https://example.com/art.jpg", width: 640, height: 640 }],
    },
    preview_url: "https://p.scdn.co/mp3-preview/abc",
    uri: `spotify:track:${id}`,
  };
}

function buildTracks(count: number): SpotifyApiTrack[] {
  return Array.from({ length: count }, (_, i) => buildApiTrack(`id-${i}`, `${1970 + i}`));
}

function createMockApiClient(
  overrides: Partial<SpotifyApiClient> = {},
): SpotifyApiClient {
  return {
    getClientCredentialsToken: vi.fn().mockResolvedValue({
      access_token: "test-token",
      expires_in: 3600,
      token_type: "Bearer",
    }),
    getAllPlaylistTracks: vi.fn().mockResolvedValue(buildTracks(15)),
    getPlaylistName: vi.fn().mockResolvedValue("Test Playlist"),
    exchangeCodeForTokens: vi.fn(),
    refreshAccessToken: vi.fn(),
    getUserProfile: vi.fn(),
    buildAuthUrl: vi.fn(),
    ...overrides,
  } as unknown as SpotifyApiClient;
}

describe("PlaylistImportService", () => {
  let tokenStore: SpotifyTokenStore;

  beforeEach(() => {
    tokenStore = new SpotifyTokenStore();
  });

  describe("importFromUrl", () => {
    it("returns an error for an invalid playlist URL", async () => {
      const service = new PlaylistImportService(createMockApiClient(), tokenStore);

      const result = await service.importFromUrl("not-a-url");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe("invalid_url");
      }
    });

    it("returns an error when the playlist has fewer than 10 usable tracks", async () => {
      const mockClient = createMockApiClient({
        getAllPlaylistTracks: vi.fn().mockResolvedValue(buildTracks(5)),
      });
      const service = new PlaylistImportService(mockClient, tokenStore);

      const result = await service.importFromUrl(
        "https://open.spotify.com/playlist/abc123",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe("too_few_tracks");
      }
    });

    it("returns success with correct counts when import is valid", async () => {
      const tracksWithOneInvalid: SpotifyApiTrack[] = [
        ...buildTracks(14),
        { ...buildApiTrack("bad"), name: "" },
      ];
      const mockClient = createMockApiClient({
        getAllPlaylistTracks: vi.fn().mockResolvedValue(tracksWithOneInvalid),
      });
      const service = new PlaylistImportService(mockClient, tokenStore);

      const result = await service.importFromUrl(
        "https://open.spotify.com/playlist/abc123",
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.importedCount).toBe(14);
        expect(result.filteredCount).toBe(1);
        expect(result.totalFetched).toBe(15);
        expect(result.playlistName).toBe("Test Playlist");
        expect(result.cards).toHaveLength(14);
      }
    });

    it("returns playlist_not_found when the Spotify API returns 404", async () => {
      const mockClient = createMockApiClient({
        getAllPlaylistTracks: vi.fn().mockRejectedValue(
          new SpotifyApiError("not_found", "Not found", 404),
        ),
      });
      const service = new PlaylistImportService(mockClient, tokenStore);

      const result = await service.importFromUrl(
        "https://open.spotify.com/playlist/abc123",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe("playlist_not_found");
      }
    });

    it("returns playlist_private when the Spotify API returns 403", async () => {
      const mockClient = createMockApiClient({
        getAllPlaylistTracks: vi.fn().mockRejectedValue(
          new SpotifyApiError("forbidden", "Forbidden", 403),
        ),
      });
      const service = new PlaylistImportService(mockClient, tokenStore);

      const result = await service.importFromUrl(
        "https://open.spotify.com/playlist/abc123",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe("playlist_private");
      }
    });

    it("uses a cached client credentials token when it is still valid", async () => {
      const mockGetToken = vi.fn().mockResolvedValue({
        access_token: "new-token",
        expires_in: 3600,
        token_type: "Bearer",
      });
      const mockClient = createMockApiClient({
        getClientCredentialsToken: mockGetToken,
      });

      tokenStore.setClientCredentials("cached-token", 3600);
      const service = new PlaylistImportService(mockClient, tokenStore);

      await service.importFromUrl("https://open.spotify.com/playlist/abc123");

      expect(mockGetToken).not.toHaveBeenCalled();
    });
  });
});
