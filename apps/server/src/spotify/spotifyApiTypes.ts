export interface SpotifyApiTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    release_date: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  preview_url: string | null;
  uri: string;
}

export interface SpotifyUserProfile {
  id: string;
  product: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface SpotifyPlaylistTracksPage {
  items: Array<{ track: SpotifyApiTrack | null }>;
  next: string | null;
  total: number;
}

export interface SpotifyPlaylistSearchItem {
  id: string;
  name: string;
  owner: {
    display_name: string | null;
  };
  images: Array<{ url: string; width: number | null; height: number | null }>;
  tracks: {
    total: number;
  };
}

export interface SpotifyPlaylistSearchResponse {
  playlists: {
    items: Array<SpotifyPlaylistSearchItem | null>;
  };
}

export interface SpotifyApiAlbum {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  images: Array<{ url: string; width: number | null; height: number | null }>;
  release_date: string;
  uri: string;
  total_tracks: number;
}

export interface SpotifyApiArtist {
  id: string;
  name: string;
  images: Array<{ url: string; width: number | null; height: number | null }>;
  uri: string;
}

export interface SpotifyTrackSearchResponse {
  tracks: {
    items: Array<SpotifyApiTrack | null>;
  };
}

export interface SpotifyAlbumSearchResponse {
  albums: {
    items: Array<SpotifyApiAlbum | null>;
  };
}

export interface SpotifyArtistSearchResponse {
  artists: {
    items: Array<SpotifyApiArtist | null>;
  };
}

export interface SpotifyAlbumResponse extends SpotifyApiAlbum {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      preview_url: string | null;
      uri: string;
    } | null>;
  };
}

export interface SpotifyPlaybackDevice {
  id: string | null;
  name: string;
  is_active: boolean;
  is_restricted: boolean;
}

export interface SpotifyClientOptions {
  accountsBaseUrl?: string;
  apiBaseUrl?: string;
}

export const DEFAULT_SPOTIFY_ACCOUNTS_BASE_URL = "https://accounts.spotify.com";
export const DEFAULT_SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  public constructor(
    public readonly code:
      | "not_found"
      | "forbidden"
      | "unauthorized"
      | "invalid_grant"
      | "api_error",
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

export function isSpotifyPlaylistSearchItem(
  item: SpotifyPlaylistSearchItem | null,
): item is SpotifyPlaylistSearchItem {
  return Boolean(
    item?.id &&
    item.name &&
    item.owner &&
    Array.isArray(item.images) &&
    typeof item.tracks?.total === "number",
  );
}

export function isSpotifyApiTrack(track: SpotifyApiTrack | null): track is SpotifyApiTrack {
  return Boolean(
    track?.id &&
    track.name &&
    Array.isArray(track.artists) &&
    track.album &&
    Array.isArray(track.album.images) &&
    track.uri,
  );
}

export function isSpotifyApiAlbum(album: SpotifyApiAlbum | null): album is SpotifyApiAlbum {
  return Boolean(
    album?.id &&
    album.name &&
    Array.isArray(album.artists) &&
    Array.isArray(album.images) &&
    album.release_date &&
    album.uri &&
    typeof album.total_tracks === "number",
  );
}

export function isSpotifyApiArtist(artist: SpotifyApiArtist | null): artist is SpotifyApiArtist {
  return Boolean(artist?.id && artist.name && Array.isArray(artist.images) && artist.uri);
}
