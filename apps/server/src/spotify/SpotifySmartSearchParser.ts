import type { SpotifySmartSearchIntent } from "@tunetrack/shared";
import { extractSpotifyPlaylistId } from "./spotifyUrlParser.js";

const OWNER_HINT_REGEX = /\bowner:([^\s]+)/i;
const YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/;

export function parseSpotifySmartSearchQuery(query: string): SpotifySmartSearchIntent | null {
  const rawQuery = query.trim();
  if (rawQuery.length < 2) return null;

  const playlistId = extractSpotifyPlaylistId(rawQuery);
  if (playlistId) {
    return {
      rawQuery,
      normalizedQuery: rawQuery.toLocaleLowerCase(),
      kind: "playlist_url",
      playlistId,
      queryWithoutQualifiers: rawQuery,
    };
  }

  const ownerMatch = rawQuery.match(OWNER_HINT_REGEX);
  const yearMatch = rawQuery.match(YEAR_REGEX);
  const ownerHint = ownerMatch?.[1];
  const yearText = yearMatch?.[1];
  const year = yearText ? Number.parseInt(yearText, 10) : undefined;
  const queryWithoutQualifiers = rawQuery
    .replace(OWNER_HINT_REGEX, "")
    .replace(YEAR_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    rawQuery,
    normalizedQuery: rawQuery.toLocaleLowerCase(),
    kind: "mixed_search",
    ...(year ? { year } : {}),
    ...(ownerHint ? { ownerHint } : {}),
    queryWithoutQualifiers: queryWithoutQualifiers || rawQuery,
  };
}
