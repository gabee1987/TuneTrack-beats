import type { TrackCardPublic } from "./track.js";

// Reissues and compilations report the year of the album that contains the track, not the
// song's original release year, so their imported year deserves a look (`CLAUDE.md` →
// Track Metadata).
const SUSPICIOUS_ALBUM_PATTERNS = [
  /\bremaster(?:ed)?\b/i,
  /\bdeluxe\b/i,
  /\banniversary\b/i,
  /\bgreatest hits\b/i,
  /\bbest of\b/i,
  /\bcollection\b/i,
  /\blive\b/i,
];

export type TrackCurationFlag = "suspicious_album";

type FlaggableTrack = Pick<TrackCardPublic, "albumTitle" | "metadataStatus">;

export function getTrackCurationFlags(track: FlaggableTrack): TrackCurationFlag[] {
  if (track.metadataStatus !== "imported") return [];

  return SUSPICIOUS_ALBUM_PATTERNS.some((pattern) => pattern.test(track.albumTitle))
    ? ["suspicious_album"]
    : [];
}

/** How many songs still need their year checked; the server and the editor share this rule. */
export function countTracksToCheck(tracks: readonly FlaggableTrack[]): number {
  return tracks.filter((track) => getTrackCurationFlags(track).length > 0).length;
}

export function shouldShowSourceYear(
  track: Pick<TrackCardPublic, "releaseYear" | "sourceReleaseYear">,
): boolean {
  return track.sourceReleaseYear !== undefined && track.sourceReleaseYear !== track.releaseYear;
}
