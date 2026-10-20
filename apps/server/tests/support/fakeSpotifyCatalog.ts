import { vi } from "vitest";
import type { SpotifyAccountsClient } from "../../src/spotify/SpotifyAccountsClient.js";
import type {
  SpotifyApiAlbum,
  SpotifyApiArtist,
  SpotifyApiTrack,
  SpotifyPlaylistSearchItem,
} from "../../src/spotify/spotifyApiTypes.js";
import type { SpotifyCatalogClient } from "../../src/spotify/SpotifyCatalogClient.js";
import { SpotifyClientCredentials } from "../../src/spotify/SpotifyClientCredentials.js";
import { SpotifyTokenStore } from "../../src/spotify/SpotifyTokenStore.js";

export const TEST_APP_TOKEN = "TEST_APP_TOKEN";

export function spotifyTrack(
  id: string,
  releaseDate: string,
  overrides: Partial<SpotifyApiTrack> = {},
): SpotifyApiTrack {
  return {
    id,
    name: `Test Song ${id}`,
    artists: [{ name: "Test Artist" }],
    album: {
      name: "Test Album",
      release_date: releaseDate,
      images: [{ url: `https://images.example.test/${id}.jpg`, width: 640, height: 640 }],
    },
    preview_url: null,
    uri: `spotify:track:${id}`,
    ...overrides,
  };
}

export function spotifyAlbum(id: string, releaseDate: string): SpotifyApiAlbum {
  return {
    id,
    name: `Test Album ${id}`,
    artists: [{ name: "Test Artist" }, { name: "Guest Artist" }],
    images: [],
    release_date: releaseDate,
    uri: `spotify:album:${id}`,
    total_tracks: 12,
  };
}

export function spotifyArtist(id: string): SpotifyApiArtist {
  return {
    id,
    name: `Test Artist ${id}`,
    images: [{ url: `https://images.example.test/${id}.jpg`, width: 320, height: 320 }],
    uri: `spotify:artist:${id}`,
  };
}

export function spotifyPlaylist(
  id: string,
  ownerName: string | null = "Test Owner",
): SpotifyPlaylistSearchItem {
  return {
    id,
    name: `Test Playlist ${id}`,
    owner: { display_name: ownerName },
    images: [],
    tracks: { total: 25 },
  };
}

type Search<T> = (
  query: string,
  accessToken: string,
  limit: number,
  offset?: number,
) => Promise<T[]>;
type Lookup<T> = (id: string, accessToken: string) => Promise<T>;

/** Every catalogue read answers empty until a test overrides it. */
export function createFakeCatalog() {
  return {
    getPlaylistSearchItem: vi.fn<Lookup<SpotifyPlaylistSearchItem>>(async (playlistId) =>
      spotifyPlaylist(playlistId),
    ),
    searchPlaylists: vi.fn<Search<SpotifyPlaylistSearchItem>>(async () => []),
    searchTracks: vi.fn<Search<SpotifyApiTrack>>(async () => []),
    searchAlbums: vi.fn<Search<SpotifyApiAlbum>>(async () => []),
    searchArtists: vi.fn<Search<SpotifyApiArtist>>(async () => []),
    getAlbumTracks: vi.fn<Lookup<SpotifyApiTrack[]>>(async () => []),
    getArtistTopTracks: vi.fn<Lookup<SpotifyApiTrack[]>>(async () => []),
    getAllPlaylistTracks: vi.fn<Lookup<SpotifyApiTrack[]>>(async () => []),
  };
}

export type FakeCatalog = ReturnType<typeof createFakeCatalog>;

export function asCatalogClient(catalog: FakeCatalog): SpotifyCatalogClient {
  return catalog as unknown as SpotifyCatalogClient;
}

/** App credentials that already hold a valid token, so no accounts request is made. */
export function createAppCredentials(): SpotifyClientCredentials {
  const tokenStore = new SpotifyTokenStore();
  tokenStore.setClientCredentials(TEST_APP_TOKEN, 3600);
  return new SpotifyClientCredentials({} as SpotifyAccountsClient, tokenStore);
}
