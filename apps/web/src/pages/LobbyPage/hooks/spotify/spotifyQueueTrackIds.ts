import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlaylistTracksPayload,
  type PublicTrackInfo,
  type SpotifySmartSearchResult,
} from "@tunetrack/shared";
import { getSocketClient } from "../../../../services/socket/socketClient";

const SMART_SEARCH_TRACK_ID_PREFIX = "spotify-search-";
const SPOTIFY_TRACK_URI_PREFIX = "spotify:track:";

export function appendUniqueSmartSearchResults(
  current: SpotifySmartSearchResult[],
  incoming: SpotifySmartSearchResult[],
): SpotifySmartSearchResult[] {
  const seenIds = new Set(current.map((result) => `${result.type}:${result.id}`));
  const nextResults = [...current];

  incoming.forEach((result) => {
    const key = `${result.type}:${result.id}`;
    if (seenIds.has(key)) return;
    seenIds.add(key);
    nextResults.push(result);
  });

  return nextResults;
}

export function mapSmartSearchResultToTrack(result: SpotifySmartSearchResult): PublicTrackInfo[] {
  if (result.type !== "track" || !result.spotifyUri) return [];

  const releaseYear = result.releaseYear ?? new Date().getFullYear();
  const trackId = getSmartSearchQueueTrackId(result);
  if (!trackId) return [];

  return [
    {
      id: trackId,
      title: result.title,
      artist: result.artist ?? result.subtitle,
      albumTitle: result.albumTitle ?? result.title,
      releaseYear,
      sourceReleaseYear: releaseYear,
      metadataStatus: "imported",
      spotifyTrackUri: result.spotifyUri,
      ...(result.imageUrl ? { artworkUrl: result.imageUrl } : {}),
      ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
    },
  ];
}

export function getSmartSearchQueueTrackId(result: SpotifySmartSearchResult): string | null {
  if (result.type !== "track") return null;
  return result.id;
}

export function getSpotifyTrackIdFromQueuedTrack(track: PublicTrackInfo): string | null {
  if (track.spotifyTrackUri?.startsWith(SPOTIFY_TRACK_URI_PREFIX)) {
    const uriId = track.spotifyTrackUri.slice(SPOTIFY_TRACK_URI_PREFIX.length).trim();
    if (uriId) return uriId;
  }

  if (track.id.startsWith(SMART_SEARCH_TRACK_ID_PREFIX)) {
    const legacyId = track.id.slice(SMART_SEARCH_TRACK_ID_PREFIX.length).trim();
    return legacyId || null;
  }

  return track.id || null;
}

export function getQueuedSpotifyTrackIdsFromPlaylistTracks(
  tracks: PublicTrackInfo[],
): Set<string> {
  const ids = new Set<string>();
  tracks.forEach((track) => {
    const spotifyTrackId = getSpotifyTrackIdFromQueuedTrack(track);
    if (spotifyTrackId) ids.add(spotifyTrackId);
  });
  return ids;
}

export function getQueuedTrackIdsFromPlaylistTracks(tracks: PublicTrackInfo[]): Set<string> {
  return new Set(tracks.map((track) => track.id));
}

export function getRemovableTrackIdsForSmartSearchResults(
  results: SpotifySmartSearchResult[],
): string[] {
  const trackIds = new Set<string>();

  results.forEach((result) => {
    const trackId = getSmartSearchQueueTrackId(result);
    if (!trackId) return;
    trackIds.add(trackId);
    trackIds.add(`${SMART_SEARCH_TRACK_ID_PREFIX}${trackId}`);
  });

  return Array.from(trackIds);
}

export function isSmartSearchResultQueued(
  result: SpotifySmartSearchResult,
  queuedSpotifyTrackIds: ReadonlySet<string>,
): boolean {
  if (result.type !== "track") return false;
  return queuedSpotifyTrackIds.has(result.id);
}

export async function getCurrentPlaylistTracks(roomId: string) {
  const socket = await getSocketClient();

  return new Promise<PlaylistTracksPayload["tracks"]>((resolve) => {
    socket.once(ServerToClientEvent.PlaylistTracks, (payload: PlaylistTracksPayload) => {
      resolve(payload.tracks);
    });
    socket.emit(ClientToServerEvent.GetPlaylistTracks, { roomId });
  });
}
