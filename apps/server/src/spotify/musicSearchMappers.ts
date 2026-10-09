import type { SpotifySmartSearchIntent, SpotifySmartSearchResult } from "@tunetrack/shared";
import type { SpotifyApiAlbum, SpotifyApiArtist, SpotifyApiTrack } from "./spotifyApiTypes.js";

export function buildTrackSearchQuery(parsed: SpotifySmartSearchIntent): string {
  if (!parsed.year) return parsed.queryWithoutQualifiers;
  return `${parsed.queryWithoutQualifiers} year:${parsed.year}`;
}

export function mapTrackResult(track: SpotifyApiTrack): SpotifySmartSearchResult {
  const releaseYear = getTrackReleaseYear(track);
  const artist = track.artists.map((item) => item.name).join(", ");
  return {
    id: track.id,
    type: "track",
    title: track.name,
    subtitle: [artist, releaseYear ? String(releaseYear) : track.album.name]
      .filter(Boolean)
      .join(" · "),
    artist,
    albumTitle: track.album.name,
    ...(releaseYear ? { releaseYear } : {}),
    ...(track.preview_url ? { previewUrl: track.preview_url } : {}),
    spotifyUri: track.uri,
    ...(track.album.images[0]?.url ? { imageUrl: track.album.images[0].url } : {}),
  };
}

export function mapAlbumResult(album: SpotifyApiAlbum): SpotifySmartSearchResult {
  const artist = album.artists.map((item) => item.name).join(", ");
  const releaseYear = Number.parseInt(album.release_date.slice(0, 4), 10);
  return {
    id: album.id,
    type: "album",
    title: album.name,
    subtitle: [artist, Number.isFinite(releaseYear) ? String(releaseYear) : null]
      .filter(Boolean)
      .join(" · "),
    artist,
    trackCount: album.total_tracks,
    ...(Number.isFinite(releaseYear) ? { releaseYear } : {}),
    spotifyUri: album.uri,
    ...(album.images[0]?.url ? { imageUrl: album.images[0].url } : {}),
  };
}

export function mapArtistResult(artist: SpotifyApiArtist): SpotifySmartSearchResult {
  return {
    id: artist.id,
    type: "artist",
    title: artist.name,
    subtitle: "Artist",
    spotifyUri: artist.uri,
    ...(artist.images[0]?.url ? { imageUrl: artist.images[0].url } : {}),
  };
}

export function getTrackReleaseYear(track: SpotifyApiTrack): number | null {
  const year = Number.parseInt(track.album.release_date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}
