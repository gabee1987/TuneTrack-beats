const SPOTIFY_PLAYLIST_URL_REGEX =
  /^https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/;

const SPOTIFY_PLAYLIST_URI_REGEX = /^spotify:playlist:([a-zA-Z0-9]+)$/;

export function extractSpotifyPlaylistId(url: string): string | null {
  const urlMatch = SPOTIFY_PLAYLIST_URL_REGEX.exec(url.trim());
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  const uriMatch = SPOTIFY_PLAYLIST_URI_REGEX.exec(url.trim());
  if (uriMatch?.[1]) {
    return uriMatch[1];
  }

  return null;
}
