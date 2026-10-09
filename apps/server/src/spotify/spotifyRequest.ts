import { SpotifyApiError } from "./spotifyApiTypes.js";

export function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

/** One status mapping for every read: the services turn these codes into user messages. */
export function spotifyErrorForStatus(status: number, message: string): SpotifyApiError {
  switch (status) {
    case 401:
      return new SpotifyApiError("unauthorized", message, status);
    case 403:
      return new SpotifyApiError("forbidden", message, status);
    case 404:
      return new SpotifyApiError("not_found", message, status);
    default:
      return new SpotifyApiError("api_error", message, status);
  }
}

export async function getSpotifyJson<T>(
  url: string,
  accessToken: string,
  failureMessage: string,
): Promise<T> {
  const response = await fetch(url, { headers: bearerHeaders(accessToken) });
  if (!response.ok) throw spotifyErrorForStatus(response.status, failureMessage);
  return (await response.json()) as T;
}
