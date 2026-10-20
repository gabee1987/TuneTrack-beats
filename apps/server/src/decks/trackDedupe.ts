export interface DedupableTrack {
  title: string;
  artist: string;
  spotifyTrackUri?: string | undefined;
}

export interface DedupeResult<T> {
  tracks: T[];
  duplicateCount: number;
}

const BRACKETED_SUFFIX = /\s*[([][^)\]]*[)\]]/g;
// Spotify's " - Remastered 2011" style: only version notes, so " - Part 2" stays distinct.
const VERSION_SUFFIX = /\s+-\s+[^-]*\b(remaster(ed)?|edit|version|mix|mono|stereo)\b.*$/i;
const COMBINING_MARKS = /\p{M}/gu;

/**
 * Keeps the first of each song. A track is a repeat when its Spotify URI or its song key was
 * seen before, so the same song from an album and a compilation (two URIs) enters once.
 */
export function dedupeTracks<T extends DedupableTrack>(tracks: readonly T[]): DedupeResult<T> {
  const seenUris = new Set<string>();
  const seenSongKeys = new Set<string>();
  const uniqueTracks: T[] = [];

  for (const track of tracks) {
    const songKey = buildSongKey(track);
    const isRepeat =
      (track.spotifyTrackUri !== undefined && seenUris.has(track.spotifyTrackUri)) ||
      seenSongKeys.has(songKey);
    if (isRepeat) continue;

    if (track.spotifyTrackUri !== undefined) seenUris.add(track.spotifyTrackUri);
    seenSongKeys.add(songKey);
    uniqueTracks.push(track);
  }

  return { tracks: uniqueTracks, duplicateCount: tracks.length - uniqueTracks.length };
}

/** Case-folded title and primary artist without diacritics or version notes. */
export function buildSongKey(track: Pick<DedupableTrack, "title" | "artist">): string {
  const primaryArtist = track.artist.split(",")[0] ?? track.artist;
  return `${normalizeSongPart(stripVersionNotes(track.title))}:${normalizeSongPart(primaryArtist)}`;
}

function stripVersionNotes(title: string): string {
  return title.replace(BRACKETED_SUFFIX, "").replace(VERSION_SUFFIX, "");
}

function normalizeSongPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}
