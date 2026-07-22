import {
  ClientToServerEvent,
  ServerToClientEvent,
  type ServerErrorPayload,
  type SpotifyPlaybackResultPayload,
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
  /** Call from a user gesture so later remote play commands are allowed. */
  unlockPlayback: () => void;
  playTrack: (spotifyTrackUri: string) => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
}

const SERVER_PLAY_TIMEOUT_MS = 12_000;
const PLAYBACK_CONFIRM_TIMEOUT_MS = 8_000;

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
  const [hasActiveContext, setHasActiveContext] = useState(false);

  const playerRef = useRef<Spotify.Player | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const pendingGetOAuthTokenRef = useRef<((token: string) => void) | null>(null);
  const isPlayingRef = useRef(false);
  const positionSnapshotRef = useRef(0);
  const positionSnapshotTimeRef = useRef(0);
  const durationRef = useRef(0);
  const deviceIdRef = useRef<string | null>(null);
  const currentTrackUriRef = useRef<string | null>(null);
  const playConfirmRef = useRef<{
    uri: string;
    resolve: (success: boolean) => void;
    timeoutId: number;
  } | null>(null);

  const resetPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setHasActiveContext(false);
    isPlayingRef.current = false;
    positionSnapshotRef.current = 0;
    positionSnapshotTimeRef.current = 0;
    durationRef.current = 0;
    currentTrackUriRef.current = null;
  }, []);

  const failPendingPlayConfirmation = useCallback(() => {
    const pending = playConfirmRef.current;
    if (!pending) {
      return;
    }
    playConfirmRef.current = null;
    window.clearTimeout(pending.timeoutId);
    pending.resolve(false);
  }, []);

  const pauseCurrentSpotifyDevice = useCallback(() => {
    // Pause via the Web Playback SDK only — browser REST calls to api.spotify.com
    // are blocked by CORS from this origin.
    void playerRef.current?.pause().catch(() => undefined);
    resetPlaybackState();
  }, [resetPlaybackState]);

  const requestToken = useCallback(async (): Promise<string | null> => {
    const socketClient = await getSocketClient();
    return new Promise((resolve) => {
      function cleanup() {
        socketClient.off(ServerToClientEvent.SpotifyTokenRefreshed, handleTokenRefreshed);
        socketClient.off(ServerToClientEvent.Error, handleRefreshError);
      }

      function handleTokenRefreshed(payload: SpotifyTokenRefreshedPayload) {
        cleanup();
        accessTokenRef.current = payload.accessToken;
        resolve(payload.accessToken);
      }

      function handleRefreshError(payload: ServerErrorPayload) {
        if (payload.code !== "SPOTIFY_TOKEN_REFRESH_FAILED") return;
        cleanup();
        accessTokenRef.current = null;
        resolve(null);
      }

      socketClient.on(ServerToClientEvent.SpotifyTokenRefreshed, handleTokenRefreshed);
      socketClient.on(ServerToClientEvent.Error, handleRefreshError);
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
        failPendingPlayConfirmation();
      });
      player.addListener("autoplay_failed", () => {
        console.warn("[TuneTrack] Spotify SDK autoplay failed — needs a user gesture");
        failPendingPlayConfirmation();
      });

      player.on("ready", ({ device_id }) => {
        if (disposed) return;
        console.info("[TuneTrack] Spotify SDK ready, device_id:", device_id);
        deviceIdRef.current = device_id;
        setDeviceId(device_id);
        setIsReady(true);
        void player?.activateElement().catch(() => undefined);
      });

      player.on("not_ready", () => {
        if (disposed) return;
        setIsReady(false);
      });

      player.on("player_state_changed", (state) => {
        if (disposed || !state) return;
        const playing = !state.paused;
        const trackUri = state.track_window.current_track?.uri ?? null;
        currentTrackUriRef.current = trackUri;
        setIsPlaying(playing);
        setHasActiveContext(true);
        isPlayingRef.current = playing;
        positionSnapshotRef.current = state.position;
        positionSnapshotTimeRef.current = Date.now();
        durationRef.current = state.duration;
        setPosition(state.position);
        setDuration(state.duration);

        const pending = playConfirmRef.current;
        if (pending && trackUri === pending.uri && playing) {
          playConfirmRef.current = null;
          window.clearTimeout(pending.timeoutId);
          pending.resolve(true);
        }
      });

      await player.connect();
      playerRef.current = player;
    }

    void init();

    return () => {
      disposed = true;
      failPendingPlayConfirmation();
      void player?.pause().catch(() => undefined);
      player?.disconnect();
      playerRef.current = null;
      setIsReady(false);
      setDeviceId(null);
      deviceIdRef.current = null;
      resetPlaybackState();
    };
  }, [enabled, requestToken, resetPlaybackState, failPendingPlayConfirmation]);

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

  useEffect(() => {
    if (!enabled) return;
    const intervalId = window.setInterval(() => {
      if (!isPlayingRef.current) return;
      const elapsed = Date.now() - positionSnapshotTimeRef.current;
      const interpolated = Math.min(positionSnapshotRef.current + elapsed, durationRef.current);
      setPosition(interpolated);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    async function refresh() {
      const token = await requestToken();
      if (token) accessTokenRef.current = token;
    }

    void refresh();

    const intervalId = window.setInterval(
      () => {
        void refresh();
      },
      55 * 60 * 1000,
    );

    return () => window.clearInterval(intervalId);
  }, [enabled, requestToken]);

  const unlockPlayback = useCallback(() => {
    void playerRef.current?.activateElement().catch(() => undefined);
  }, []);

  const waitForPlayingUri = useCallback((spotifyTrackUri: string): Promise<boolean> => {
    const alreadyPlaying =
      currentTrackUriRef.current === spotifyTrackUri && isPlayingRef.current;
    if (alreadyPlaying) {
      return Promise.resolve(true);
    }

    failPendingPlayConfirmation();

    return new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        if (playConfirmRef.current?.uri === spotifyTrackUri) {
          playConfirmRef.current = null;
          console.error("[TuneTrack] Spotify playTrack: timed out waiting for audible playback");
          resolve(false);
        }
      }, PLAYBACK_CONFIRM_TIMEOUT_MS);

      playConfirmRef.current = {
        uri: spotifyTrackUri,
        resolve,
        timeoutId,
      };
    });
  }, [failPendingPlayConfirmation]);

  const requestServerPlay = useCallback(
    async (spotifyTrackUri: string, deviceIdValue: string): Promise<boolean> => {
      const socketClient = await getSocketClient();

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          cleanup();
          console.error("[TuneTrack] Spotify playTrack: timed out waiting for server");
          resolve(false);
        }, SERVER_PLAY_TIMEOUT_MS);

        function cleanup() {
          window.clearTimeout(timeoutId);
          socketClient.off(ServerToClientEvent.SpotifyPlaybackResult, handleResult);
        }

        function handleResult(payload: SpotifyPlaybackResultPayload) {
          cleanup();
          if (!payload.success) {
            console.error(
              `[TuneTrack] Spotify playTrack failed (${payload.code}):`,
              payload.message,
            );
            resolve(false);
            return;
          }
          resolve(true);
        }

        socketClient.on(ServerToClientEvent.SpotifyPlaybackResult, handleResult);
        socketClient.emit(ClientToServerEvent.PlaySpotifyTrack, {
          roomId,
          deviceId: deviceIdValue,
          spotifyTrackUri,
        });
      });
    },
    [roomId],
  );

  const playTrack = useCallback(
    async (spotifyTrackUri: string): Promise<boolean> => {
      const activeDeviceId = deviceIdRef.current;
      if (!activeDeviceId) {
        return false;
      }

      try {
        await playerRef.current?.activateElement();
      } catch {
        // Autoplay policies can reject this until a gesture; play may still work.
      }

      const serverAccepted = await requestServerPlay(spotifyTrackUri, activeDeviceId);
      if (!serverAccepted) {
        return false;
      }

      // Server 204 only means Spotify accepted the command. Confirm the SDK is
      // actually playing this URI — otherwise later auto-plays get skipped.
      return waitForPlayingUri(spotifyTrackUri);
    },
    [requestServerPlay, waitForPlayingUri],
  );

  const pause = useCallback(() => {
    pauseCurrentSpotifyDevice();
  }, [pauseCurrentSpotifyDevice]);

  const resume = useCallback(() => {
    void playerRef.current?.activateElement().catch(() => undefined);
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
    unlockPlayback,
    playTrack,
    pause,
    resume,
    seek,
  };
}
