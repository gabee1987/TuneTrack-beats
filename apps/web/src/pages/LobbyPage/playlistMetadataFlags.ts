import type { PublicTrackInfo } from "@tunetrack/shared";

const SUSPICIOUS_ALBUM_PATTERNS = [
  /\bremaster(?:ed)?\b/i,
  /\bdeluxe\b/i,
  /\banniversary\b/i,
  /\bgreatest hits\b/i,
  /\bbest of\b/i,
  /\bcollection\b/i,
  /\blive\b/i,
];

export type PlaylistTrackCurationFlag = "suspicious_album";

export function getPlaylistTrackCurationFlags(track: PublicTrackInfo): PlaylistTrackCurationFlag[] {
  if (track.metadataStatus !== "imported") return [];

  return SUSPICIOUS_ALBUM_PATTERNS.some((pattern) => pattern.test(track.albumTitle))
    ? ["suspicious_album"]
    : [];
}

export function shouldShowSourceYear(track: PublicTrackInfo): boolean {
  return track.sourceReleaseYear !== undefined && track.sourceReleaseYear !== track.releaseYear;
}
