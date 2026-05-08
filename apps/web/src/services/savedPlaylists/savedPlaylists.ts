import type { PublicTrackInfo, TrackMetadataStatus } from "@tunetrack/shared";

const STORAGE_KEY = "tunetrack.savedPlaylists.v1";
const MAX_SAVED_PLAYLISTS = 20;

export interface SavedPlaylistTrack {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  sourceReleaseYear?: number;
  metadataStatus: TrackMetadataStatus;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyTrackUri?: string;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  source: "spotify";
  sourcePlaylistUrl?: string;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
  tracks: SavedPlaylistTrack[];
}

interface SavedPlaylistStore {
  playlists: SavedPlaylist[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavePlaylistInput {
  name: string;
  sourcePlaylistUrl?: string;
  tracks: PublicTrackInfo[];
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function listSavedPlaylists(storage: StorageLike | null = getDefaultStorage()): SavedPlaylist[] {
  if (!storage) return [];
  return readStore(storage).playlists;
}

export function savePlaylist(
  input: SavePlaylistInput,
  storage: StorageLike | null = getDefaultStorage(),
): SavedPlaylist | null {
  if (!storage) return null;

  const now = Date.now();
  const playlist: SavedPlaylist = {
    id: createPlaylistId(),
    name: input.name.trim() || "Saved playlist",
    source: "spotify",
    ...(input.sourcePlaylistUrl ? { sourcePlaylistUrl: input.sourcePlaylistUrl } : {}),
    createdAtEpochMs: now,
    updatedAtEpochMs: now,
    tracks: input.tracks.map(toSavedPlaylistTrack),
  };

  const current = readStore(storage).playlists;
  writeStore(storage, { playlists: [playlist, ...current].slice(0, MAX_SAVED_PLAYLISTS) });
  return playlist;
}

export function updateSavedPlaylist(
  playlistId: string,
  tracks: PublicTrackInfo[],
  storage: StorageLike | null = getDefaultStorage(),
): SavedPlaylist[] {
  if (!storage) return [];

  const now = Date.now();
  const nextPlaylists = readStore(storage).playlists.map((playlist) =>
    playlist.id === playlistId
      ? { ...playlist, tracks: tracks.map(toSavedPlaylistTrack), updatedAtEpochMs: now }
      : playlist,
  );
  writeStore(storage, { playlists: nextPlaylists });
  return nextPlaylists;
}

export function renameSavedPlaylist(
  playlistId: string,
  newName: string,
  storage: StorageLike | null = getDefaultStorage(),
): SavedPlaylist[] {
  if (!storage) return [];

  const now = Date.now();
  const nextPlaylists = readStore(storage).playlists.map((playlist) =>
    playlist.id === playlistId
      ? { ...playlist, name: newName.trim() || playlist.name, updatedAtEpochMs: now }
      : playlist,
  );
  writeStore(storage, { playlists: nextPlaylists });
  return nextPlaylists;
}

export function deleteSavedPlaylist(
  playlistId: string,
  storage: StorageLike | null = getDefaultStorage(),
): SavedPlaylist[] {
  if (!storage) return [];

  const nextPlaylists = readStore(storage).playlists.filter(
    (playlist) => playlist.id !== playlistId,
  );
  writeStore(storage, { playlists: nextPlaylists });
  return nextPlaylists;
}

function readStore(storage: StorageLike): SavedPlaylistStore {
  const rawValue = storage.getItem(STORAGE_KEY);
  if (!rawValue) return { playlists: [] };

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isSavedPlaylistStore(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return { playlists: [] };
    }

    return { playlists: parsed.playlists.slice(0, MAX_SAVED_PLAYLISTS) };
  } catch {
    storage.removeItem(STORAGE_KEY);
    return { playlists: [] };
  }
}

function writeStore(storage: StorageLike, store: SavedPlaylistStore): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function toSavedPlaylistTrack(track: PublicTrackInfo): SavedPlaylistTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    albumTitle: track.albumTitle,
    releaseYear: track.releaseYear,
    sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
    metadataStatus: track.metadataStatus,
    ...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {}),
    ...(track.previewUrl ? { previewUrl: track.previewUrl } : {}),
    ...(track.spotifyTrackUri ? { spotifyTrackUri: track.spotifyTrackUri } : {}),
  };
}

function createPlaylistId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSavedPlaylistStore(value: unknown): value is SavedPlaylistStore {
  if (!value || typeof value !== "object") return false;
  const playlists = (value as { playlists?: unknown }).playlists;
  return Array.isArray(playlists) && playlists.every(isSavedPlaylist);
}

function isSavedPlaylist(value: unknown): value is SavedPlaylist {
  if (!value || typeof value !== "object") return false;
  const playlist = value as Partial<SavedPlaylist>;
  return (
    typeof playlist.id === "string" &&
    typeof playlist.name === "string" &&
    playlist.source === "spotify" &&
    typeof playlist.createdAtEpochMs === "number" &&
    typeof playlist.updatedAtEpochMs === "number" &&
    Array.isArray(playlist.tracks) &&
    playlist.tracks.every(isSavedPlaylistTrack)
  );
}

function isSavedPlaylistTrack(value: unknown): value is SavedPlaylistTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<SavedPlaylistTrack>;
  return (
    typeof track.id === "string" &&
    typeof track.title === "string" &&
    typeof track.artist === "string" &&
    typeof track.albumTitle === "string" &&
    typeof track.releaseYear === "number" &&
    isTrackMetadataStatus(track.metadataStatus)
  );
}

function isTrackMetadataStatus(value: unknown): value is TrackMetadataStatus {
  return value === "imported" || value === "edited" || value === "verified";
}
