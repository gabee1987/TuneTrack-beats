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
  playbackGeneration: number;
}

export interface UseSpotifyPlaybackSdkResult {
  isReady: boolean;
  deviceId: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  hasActiveContext: boolean;
  unlockPlayback: () => void;
  playTrack: (spotifyTrackUri: string) => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
}

const SERVER_PLAY_TIMEOUT_MS = 32_000;
const PLAYBACK_CONFIRM_TIMEOUT_MS = 10_000;

const SDK_SCRIPT_SRC = "https://sdk.scdn.co/spotify-player.js";

let sdkLoadPromise: Promise<void> | null = null;

function loadSdkScript(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();

    const script = document.createElement("script");
    script.src = SDK_SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      script.remove();
      // Allow a later attempt to retry after a failed/aborted load.
      sdkLoadPromise = null;
      reject(new Error("Spotify Web Playback SDK failed to load"));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function createPlaybackRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `play-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useSpotifyPlaybackSdk({
  roomId,
  enabled,
  playbackGeneration,
}: UseSpotifyPlaybackSdkOptions): UseSpotifyPlaybackSdkResult {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasActiveContext, setHasActiveContext] = useState(false);
  // Bumping remounts the Spotify.Player after hard failures (device_not_found).
  const [playerEpoch, setPlayerEpoch] = useState(0);

  const playerRef = useRef<Spotify.Player | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const tokenRequestInFlightRef = useRef<Promise<string | null> | null>(null);
  const isPlayingRef = useRef(false);
  const positionSnapshotRef = useRef(0);
  const positionSnapshotTimeRef = useRef(0);
  const durationRef = useRef(0);
  const deviceIdRef = useRef<string | null>(null);
  const currentTrackUriRef = useRef<string | null>(null);
  const activePlayRequestIdRef = useRef<string | null>(null);
  const playbackGenerationRef = useRef(playbackGeneration);
  playbackGenerationRef.current = playbackGeneration;
  const playConfirmRef = useRef<{
    requestId: string;
    uri: string;
    resolve: (success: boolean) => void;
    timeoutId: number;
  } | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const playGenerationRef = useRef(0);

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

  const failPendingPlayConfirmation = useCallback((onlyRequestId?: string) => {
    const pending = playConfirmRef.current;
    if (!pending) {
      return;
    }
    if (onlyRequestId && pending.requestId !== onlyRequestId) {
      return;
    }
    playConfirmRef.current = null;
    window.clearTimeout(pending.timeoutId);
    pending.resolve(false);
  }, []);

  const pauseCurrentSpotifyDevice = useCallback(() => {
    void playerRef.current?.pause().catch(() => undefined);
    resetPlaybackState();
  }, [resetPlaybackState]);

  const pausePlayback = useCallback(() => {
    void playerRef.current?.pause().catch(() => undefined);
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const requestToken = useCallback(async (): Promise<string | null> => {
    if (tokenRequestInFlightRef.current) {
      return tokenRequestInFlightRef.current;
    }

    const requestPromise = (async (): Promise<string | null> => {
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
          if (
            payload.code !== "SPOTIFY_TOKEN_REFRESH_FAILED" &&
            payload.code !== "SPOTIFY_TOKEN_REFRESH_DEFERRED"
          ) {
            return;
          }
          cleanup();
          accessTokenRef.current = null;
          resolve(null);
        }

        socketClient.on(ServerToClientEvent.SpotifyTokenRefreshed, handleTokenRefreshed);
        socketClient.on(ServerToClientEvent.Error, handleRefreshError);
        socketClient.emit(ClientToServerEvent.RefreshSpotifyToken, { roomId });
      });
    })();

    tokenRequestInFlightRef.current = requestPromise;
    try {
      return await requestPromise;
    } finally {
      if (tokenRequestInFlightRef.current === requestPromise) {
        tokenRequestInFlightRef.current = null;
      }
    }
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let player: Spotify.Player | null = null;
    let authRetryUsed = false;

    async function registerDevice(nextDeviceId: string) {
      const socketClient = await getSocketClient();
      if (disposed) return;
      socketClient.emit(ClientToServerEvent.RegisterSpotifyPlaybackDevice, {
        roomId,
        deviceId: nextDeviceId,
        playbackGeneration: playbackGenerationRef.current,
      });
    }

    async function unregisterDevice() {
      try {
        const socketClient = await getSocketClient();
        socketClient.emit(ClientToServerEvent.UnregisterSpotifyPlaybackDevice, { roomId });
      } catch {
        // Best-effort on teardown.
      }
    }

    async function init() {
      accessTokenRef.current = null;
      await loadSdkScript();
      if (disposed) return;

      const freshToken = await requestToken();
      if (disposed) return;
      if (!freshToken) {
        console.error("[TuneTrack] Spotify SDK: could not obtain access token before connect");
        return;
      }

      player = new window.Spotify.Player({
        name: "TuneTrack",
        volume: 0.8,
        getOAuthToken: (cb) => {
          void requestToken().then((token) => {
            if (disposed) return;
            if (token) cb(token);
          });
        },
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK initialization error:", message);
      });
      player.addListener("authentication_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK authentication error:", message);
        accessTokenRef.current = null;
        if (disposed || authRetryUsed || !player) return;
        authRetryUsed = true;
        void requestToken().then(async (token) => {
          if (!token || disposed || !player) return;
          try {
            player.disconnect();
            await player.connect();
          } catch (error) {
            console.error("[TuneTrack] Spotify SDK reconnect after auth error failed:", error);
          }
        });
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
        void registerDevice(device_id);
      });

      player.on("not_ready", () => {
        if (disposed) return;
        setIsReady(false);
        deviceIdRef.current = null;
        setDeviceId(null);
        void unregisterDevice();
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
        if (
          pending &&
          pending.requestId === activePlayRequestIdRef.current &&
          trackUri === pending.uri &&
          playing
        ) {
          playConfirmRef.current = null;
          window.clearTimeout(pending.timeoutId);
          pending.resolve(true);
        }
      });

      await player.connect();
      if (disposed) {
        player.disconnect();
        return;
      }
      playerRef.current = player;
    }

    void init().catch((error: unknown) => {
      console.error("[TuneTrack] Spotify SDK: initialization failed", error);
    });

    return () => {
      disposed = true;
      failPendingPlayConfirmation();
      void unregisterDevice();
      void player?.pause().catch(() => undefined);
      player?.disconnect();
      playerRef.current = null;
      accessTokenRef.current = null;
      tokenRequestInFlightRef.current = null;
      deviceIdRef.current = null;
      setIsReady(false);
      setDeviceId(null);
      resetPlaybackState();
    };
  }, [
    enabled,
    playbackGeneration,
    playerEpoch,
    requestToken,
    resetPlaybackState,
    failPendingPlayConfirmation,
    roomId,
  ]);

  useEffect(() => {
    if (!enabled) {
      reconnectAttemptsRef.current = 0;
    }
  }, [enabled]);

  useEffect(() => {
    reconnectAttemptsRef.current = 0;
  }, [playbackGeneration]);

  useEffect(() => {
    if (!enabled) return;

    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    void getSocketClient().then((socketClient) => {
      if (isDisposed) return;
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
    const intervalId = window.setInterval(
      () => {
        void requestToken();
      },
      55 * 60 * 1000,
    );
    return () => window.clearInterval(intervalId);
  }, [enabled, requestToken]);

  const unlockPlayback = useCallback(() => {
    void playerRef.current?.activateElement().catch(() => undefined);
  }, []);

  const waitForPlayingUri = useCallback(
    (requestId: string, spotifyTrackUri: string): Promise<boolean> => {
      const alreadyPlaying =
        currentTrackUriRef.current === spotifyTrackUri && isPlayingRef.current;
      if (alreadyPlaying) {
        return Promise.resolve(true);
      }

      failPendingPlayConfirmation();

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          if (playConfirmRef.current?.requestId === requestId) {
            playConfirmRef.current = null;
            console.error("[TuneTrack] Spotify playTrack: timed out waiting for audible playback");
            resolve(false);
          }
        }, PLAYBACK_CONFIRM_TIMEOUT_MS);

        playConfirmRef.current = {
          requestId,
          uri: spotifyTrackUri,
          resolve,
          timeoutId,
        };
      });
    },
    [failPendingPlayConfirmation],
  );

  const requestServerPlay = useCallback(
    async (
      requestId: string,
      spotifyTrackUri: string,
      deviceIdValue: string,
    ): Promise<SpotifyPlaybackResultPayload> => {
      const socketClient = await getSocketClient();

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          cleanup();
          resolve({
            success: false,
            requestId,
            code: "device_not_found",
            message: "Timed out waiting for Spotify play result.",
          });
        }, SERVER_PLAY_TIMEOUT_MS);

        function cleanup() {
          window.clearTimeout(timeoutId);
          socketClient.off(ServerToClientEvent.SpotifyPlaybackResult, handleResult);
        }

        function handleResult(payload: SpotifyPlaybackResultPayload) {
          if (payload.requestId !== requestId) {
            return;
          }
          cleanup();
          resolve(payload);
        }

        socketClient.on(ServerToClientEvent.SpotifyPlaybackResult, handleResult);
        socketClient.emit(ClientToServerEvent.PlaySpotifyTrack, {
          roomId,
          deviceId: deviceIdValue,
          spotifyTrackUri,
          requestId,
          playbackGeneration: playbackGenerationRef.current,
        });
      });
    },
    [roomId],
  );

  const playTrack = useCallback(
    async (spotifyTrackUri: string): Promise<boolean> => {
      const activeDeviceId = deviceIdRef.current;
      if (!activeDeviceId) {
        console.error("[TuneTrack] Spotify playTrack: player device is not ready");
        return false;
      }

      const playGeneration = playGenerationRef.current + 1;
      playGenerationRef.current = playGeneration;

      const requestId = createPlaybackRequestId();
      activePlayRequestIdRef.current = requestId;

      try {
        await playerRef.current?.activateElement();
      } catch {
        // Gesture may be required; continue.
      }

      if (playGenerationRef.current !== playGeneration) {
        return false;
      }

      const serverResult = await requestServerPlay(requestId, spotifyTrackUri, activeDeviceId);
      if (
        playGenerationRef.current !== playGeneration ||
        activePlayRequestIdRef.current !== requestId
      ) {
        return false;
      }

      if (!serverResult.success) {
        if (
          serverResult.code === "superseded" ||
          serverResult.code === "stale_playback_generation"
        ) {
          return false;
        }

        console.error(
          `[TuneTrack] Spotify playTrack failed (${serverResult.code}):`,
          serverResult.message,
        );

        // Remount only after several failed attempts on the same device — remounting
        // creates a new device id and restarts Spotify Connect visibility from zero.
        if (
          serverResult.code === "device_not_found" &&
          enabled &&
          playGenerationRef.current === playGeneration
        ) {
          reconnectAttemptsRef.current += 1;
          if (reconnectAttemptsRef.current === 3) {
            setPlayerEpoch((value) => value + 1);
          }
        }

        return false;
      }

      reconnectAttemptsRef.current = 0;
      return waitForPlayingUri(requestId, spotifyTrackUri);
    },
    [enabled, requestServerPlay, waitForPlayingUri],
  );

  const pause = useCallback(() => {
    pausePlayback();
  }, [pausePlayback]);

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
