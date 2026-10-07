import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ServerErrorCode,
  type ServerErrorPayload,
  type SpotifyTokenRefreshedPayload,
} from "@tunetrack/shared/client";
import { getSocketClient } from "../../../services/socket/socketClient";

const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

/** Answers that end a token request without a token; the caller's backoff retries. */
const TOKEN_REFUSAL_CODES: ReadonlySet<ServerErrorCode> = new Set<ServerErrorCode>([
  "SPOTIFY_TOKEN_REFRESH_FAILED",
  "SPOTIFY_TOKEN_REFRESH_DEFERRED",
  // A refusal by the socket rate limit answers at once; waiting out the timeout on it left the
  // player without a token for ten seconds per attempt.
  "RATE_LIMITED",
]);

/** One `refresh_spotify_token` round trip: the access token, or `null` if none came back. */
export async function requestSpotifyAccessToken(roomId: string): Promise<string | null> {
  const socketClient = await getSocketClient();

  return new Promise((resolve) => {
    // Without this the promise could stay pending forever, and because the caller also uses it
    // as the de-duplication handle, every later token request would await the same dead promise.
    const timeoutId = window.setTimeout(() => {
      cleanup();
      console.warn("[TuneTrack] Spotify token refresh timed out");
      resolve(null);
    }, TOKEN_REQUEST_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeoutId);
      socketClient.off(ServerToClientEvent.SpotifyTokenRefreshed, handleTokenRefreshed);
      socketClient.off(ServerToClientEvent.Error, handleRefreshError);
    }

    function handleTokenRefreshed(payload: SpotifyTokenRefreshedPayload) {
      cleanup();
      resolve(payload.accessToken);
    }

    function handleRefreshError(payload: ServerErrorPayload) {
      if (!TOKEN_REFUSAL_CODES.has(payload.code)) {
        return;
      }
      cleanup();
      resolve(null);
    }

    socketClient.on(ServerToClientEvent.SpotifyTokenRefreshed, handleTokenRefreshed);
    socketClient.on(ServerToClientEvent.Error, handleRefreshError);
    socketClient.emit(ClientToServerEvent.RefreshSpotifyToken, { roomId });
  });
}
