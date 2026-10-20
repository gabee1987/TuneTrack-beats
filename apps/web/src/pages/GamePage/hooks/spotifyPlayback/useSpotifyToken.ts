import { useCallback, useEffect, useRef } from "react";
import { requestSpotifyAccessToken } from "../requestSpotifyAccessToken";

const TOKEN_REFRESH_INTERVAL_MS = 55 * 60 * 1000;

export interface SpotifyToken {
  /** One refresh round trip, shared by every caller while it is in flight. */
  requestToken: () => Promise<string | null>;
  /** Lets the next request start a fresh round trip instead of joining the pending one. */
  clearPendingTokenRequest: () => void;
}

export function useSpotifyToken({
  roomId,
  enabled,
}: {
  roomId: string;
  enabled: boolean;
}): SpotifyToken {
  const tokenRequestInFlightRef = useRef<Promise<string | null> | null>(null);

  const requestToken = useCallback(async (): Promise<string | null> => {
    if (tokenRequestInFlightRef.current) {
      return tokenRequestInFlightRef.current;
    }

    const requestPromise = requestSpotifyAccessToken(roomId);
    tokenRequestInFlightRef.current = requestPromise;
    try {
      return await requestPromise;
    } finally {
      if (tokenRequestInFlightRef.current === requestPromise) {
        tokenRequestInFlightRef.current = null;
      }
    }
  }, [roomId]);

  const clearPendingTokenRequest = useCallback(() => {
    tokenRequestInFlightRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const intervalId = window.setInterval(() => {
      void requestToken();
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, requestToken]);

  return { requestToken, clearPendingTokenRequest };
}
