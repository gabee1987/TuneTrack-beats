import {
  ClientToServerEvent,
  ServerToClientEvent,
  type SpotifyTokenRefreshedPayload,
} from "@tunetrack/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocketClient } from "../../../services/socket/socketClient";

interface UseSpotifyPlaybackSdkOptions {
  roomId: string;
  enabled: boolean;
}

export interface UseSpotifyPlaybackSdkResult {
  isReady: boolean;
  deviceId: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  hasActiveContext: boolean;
  playTrack: (spotifyTrackUri: string) => void;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
}

let sdkScriptLoaded = false;

function loadSdkScript(): Promise<void> {
  if (sdkScriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = resolve;
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.onerror = reject;
    document.head.appendChild(script);
    sdkScriptLoaded = true;
  });
}

export function useSpotifyPlaybackSdk({
  roomId,
  enabled,
}: UseSpotifyPlaybackSdkOptions): UseSpotifyPlaybackSdkResult {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  // true once the first player_state_changed event fires — means an API play call succeeded
  const [hasActiveContext, setHasActiveContext] = useState(false);

  const playerRef = useRef<Spotify.Player | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const pendingGetOAuthTokenRef = useRef<((token: string) => void) | null>(null);
  const isPlayingRef = useRef(false);
  const positionSnapshotRef = useRef(0);
  const positionSnapshotTimeRef = useRef(0);
  const durationRef = useRef(0);
  const deviceIdRef = useRef<string | null>(null);

  const resetPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setHasActiveContext(false);
    isPlayingRef.current = false;
    positionSnapshotRef.current = 0;
    positionSnapshotTimeRef.current = 0;
    durationRef.current = 0;
  }, []);

  const pauseCurrentSpotifyDevice = useCallback(() => {
    const token = accessTokenRef.current;
    const deviceIdValue = deviceIdRef.current;

    void playerRef.current?.pause();
    resetPlaybackState();

    if (!token) {
      return;
    }

    const url = new URL("https://api.spotify.com/v1/me/player/pause");
    if (deviceIdValue) {
      url.searchParams.set("device_id", deviceIdValue);
    }

    void fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined);
  }, [resetPlaybackState]);

  const requestToken = useCallback(async (): Promise<string | null> => {
    const socketClient = await getSocketClient();
    return new Promise((resolve) => {
      function handler(payload: SpotifyTokenRefreshedPayload) {
        socketClient.off(ServerToClientEvent.SpotifyTokenRefreshed, handler);
        accessTokenRef.current = payload.accessToken;
        resolve(payload.accessToken);
      }
      socketClient.once(ServerToClientEvent.SpotifyTokenRefreshed, handler);
      socketClient.emit(ClientToServerEvent.RefreshSpotifyToken, { roomId });
    });
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let player: Spotify.Player | null = null;

    async function init() {
      await loadSdkScript();
      if (disposed) return;

      player = new window.Spotify.Player({
        name: "TuneTrack Host",
        volume: 0.8,
        getOAuthToken: (cb) => {
          if (accessTokenRef.current) {
            cb(accessTokenRef.current);
          } else {
            pendingGetOAuthTokenRef.current = cb;
            void requestToken().then((token) => {
              if (token) {
                pendingGetOAuthTokenRef.current = null;
                cb(token);
              }
            });
          }
        },
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK initialization error:", message);
      });
      player.addListener("authentication_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK authentication error:", message);
      });
      player.addListener("account_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK account error:", message);
      });
      player.addListener("playback_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK playback error:", message);
      });

      player.on("ready", ({ device_id }) => {
        if (disposed) return;
        console.info("[TuneTrack] Spotify SDK ready, device_id:", device_id);
        deviceIdRef.current = device_id;
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.on("not_ready", () => {
        if (disposed) return;
        setIsReady(false);
      });

      player.on("player_state_changed", (state) => {
        if (disposed || !state) return;
        const playing = !state.paused;
        setIsPlaying(playing);
        setHasActiveContext(true);
        isPlayingRef.current = playing;
        positionSnapshotRef.current = state.position;
        positionSnapshotTimeRef.current = Date.now();
        durationRef.current = state.duration;
        setPosition(state.position);
        setDuration(state.duration);
      });

      await player.connect();
      playerRef.current = player;
    }

    void init();

    return () => {
      disposed = true;
      pauseCurrentSpotifyDevice();
      player?.disconnect();
      playerRef.current = null;
      setIsReady(false);
      setDeviceId(null);
      deviceIdRef.current = null;
      resetPlaybackState();
    };
  }, [enabled, pauseCurrentSpotifyDevice, requestToken, resetPlaybackState]);

  useEffect(() => {
    if (!enabled) return;

    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    void getSocketClient().then((socketClient) => {
      if (isDisposed) {
        return;
      }

      socketClient.on(ServerToClientEvent.RoomClosed, pauseCurrentSpotifyDevice);

      cleanup = () => {
        socketClient.off(ServerToClientEvent.RoomClosed, pauseCurrentSpotifyDevice);
      };
    });

    return () => {
      isDisposed = true;
      cleanup?.();
    };
  }, [enabled, pauseCurrentSpotifyDevice]);

  // Interpolate position while playing (between player_state_changed events)
  useEffect(() => {
    if (!enabled) return;
    const intervalId = window.setInterval(() => {
      if (!isPlayingRef.current) return;
      const elapsed = Date.now() - positionSnapshotTimeRef.current;
      const interpolated = Math.min(
        positionSnapshotRef.current + elapsed,
        durationRef.current,
      );
      setPosition(interpolated);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [enabled]);

  // Keep the token fresh: refresh ~1 minute before expiry
  useEffect(() => {
    if (!enabled) return;

    async function refresh() {
      const token = await requestToken();
      if (token) accessTokenRef.current = token;
    }

    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 55 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, requestToken]);

  const playTrack = useCallback(
    (spotifyTrackUri: string) => {
      const deviceIdValue = deviceId;
      if (!deviceIdValue) return;

      async function doPlay() {
        // Await the token if not yet cached (handles the startup race condition)
        let token = accessTokenRef.current;
        if (!token) {
          token = await requestToken();
          if (!token) {
            console.error("[TuneTrack] Spotify playTrack: could not obtain token");
            return;
          }
        }
        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdValue}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: [spotifyTrackUri] }),
          },
        );
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error(`[TuneTrack] Spotify playTrack failed ${res.status}:`, body);
        }
      }

      void doPlay();
    },
    [deviceId, requestToken],
  );

  const pause = useCallback(() => {
    pauseCurrentSpotifyDevice();
  }, [pauseCurrentSpotifyDevice]);

  const resume = useCallback(() => {
    void playerRef.current?.resume();
  }, []);

  const seek = useCallback((positionMs: number) => {
    void playerRef.current?.seek(positionMs);
  }, []);

  return {
    isReady,
    deviceId,
    isPlaying,
    position,
    duration,
    hasActiveContext,
    playTrack,
    pause,
    resume,
    seek,
  };
}
