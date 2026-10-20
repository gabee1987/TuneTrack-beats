import { ClientToServerEvent } from "@tunetrack/shared/client";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { getSocketClient } from "../../../../services/socket/socketClient";
import { loadSpotifySdk } from "./spotifySdkLoader";
import type { SpotifyToken } from "./useSpotifyToken";

// `connect()` never settles while the SDK waits for a token; past this the build is retried.
const PLAYER_CONNECT_TIMEOUT_MS = 15_000;
const DEVICE_RECOVERY_COOLDOWN_MS = 5_000;

/**
 * The server defers a token refresh for reasons that clear on their own — a membership that
 * has not finished restoring after a reload, a transient Spotify API failure. Giving up on
 * one of those left the player unbuilt for the rest of the session, so retry until it works
 * or the hook goes away. The last delay repeats.
 */
const TOKEN_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

/** Player events the rest of the playback hook reacts to. Read at event time, never stale. */
export interface SpotifyPlayerHandlers {
  onStateChange: (state: Spotify.PlaybackState) => void;
  onPlaybackError: () => void;
  onAutoplayFailed: () => void;
  /** The player is going away: a rebuild, a disabled hook or an unmount. */
  onTeardown: () => void;
}

export interface SpotifyPlayerLifecycle {
  isReady: boolean;
  deviceId: string | null;
  playerRef: MutableRefObject<Spotify.Player | null>;
  /** Read by a play attempt in the same tick, before the state update has landed. */
  deviceIdRef: MutableRefObject<string | null>;
  /** Rebuilds the player, at most once per cooldown. */
  requestPlayerRecovery: () => void;
  /** Rebuilds the player unconditionally. */
  rebuildPlayer: () => void;
}

function retryDelayFor(attempt: number): number {
  return TOKEN_RETRY_DELAYS_MS[Math.min(attempt, TOKEN_RETRY_DELAYS_MS.length - 1)] ?? 15_000;
}

/**
 * Owns the `Spotify.Player`: loads the SDK, builds and connects the player, registers its
 * device with the server and tears it all down again. A new playback generation or a
 * rebuild request builds a new player with a new device id.
 */
export function useSpotifyPlayerLifecycle({
  roomId,
  enabled,
  playbackGeneration,
  token,
  handlers,
}: {
  roomId: string;
  enabled: boolean;
  playbackGeneration: number;
  token: SpotifyToken;
  handlers: SpotifyPlayerHandlers;
}): SpotifyPlayerLifecycle {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // Bumping remounts the Spotify.Player after hard failures (device_not_found).
  const [playerEpoch, setPlayerEpoch] = useState(0);

  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const lastPlayerRecoveryAtRef = useRef(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const { requestToken, clearPendingTokenRequest } = token;

  const rebuildPlayer = useCallback(() => {
    setPlayerEpoch((value) => value + 1);
  }, []);

  /**
   * A device that never arrived, or that went away with `not_ready`, leaves every play
   * request failing on the spot. Rebuilding the player is the only way back, so a play
   * attempt against a dead device asks for one instead of just reporting failure.
   */
  const requestPlayerRecovery = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayerRecoveryAtRef.current < DEVICE_RECOVERY_COOLDOWN_MS) {
      return;
    }
    lastPlayerRecoveryAtRef.current = now;
    console.warn("[TuneTrack] Spotify SDK: rebuilding the player after a dead device");
    rebuildPlayer();
  }, [rebuildPlayer]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let player: Spotify.Player | null = null;
    let authRetryUsed = false;
    let releaseBootWait: (() => void) | null = null;
    let bootWaitTimeoutId: number | null = null;

    async function waitBeforeRetry(delayMs: number) {
      await new Promise<void>((resolve) => {
        releaseBootWait = resolve;
        bootWaitTimeoutId = window.setTimeout(resolve, delayMs);
      });
      releaseBootWait = null;
      if (bootWaitTimeoutId !== null) {
        window.clearTimeout(bootWaitTimeoutId);
        bootWaitTimeoutId = null;
      }
    }

    async function acquireAccessToken(): Promise<string | null> {
      for (let attempt = 0; !disposed; attempt += 1) {
        const accessToken = await requestToken();
        if (disposed || accessToken) {
          return accessToken;
        }
        const delayMs = retryDelayFor(attempt);
        console.warn(`[TuneTrack] Spotify SDK: no access token yet, retrying in ${delayMs}ms`);
        await waitBeforeRetry(delayMs);
      }
      return null;
    }

    async function registerDevice(nextDeviceId: string) {
      const socketClient = await getSocketClient();
      if (disposed) return;
      socketClient.emit(ClientToServerEvent.RegisterSpotifyPlaybackDevice, {
        roomId,
        deviceId: nextDeviceId,
        playbackGeneration,
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
      await loadSpotifySdk();
      if (disposed) return;

      const freshToken = await acquireAccessToken();
      if (disposed || !freshToken) return;

      // A build costs one refresh: the SDK's first request reuses `init`'s token. Later ones retry
      // until a token arrives, because an unanswered `cb` leaves `connect()` pending for good.
      let initialToken: string | null = freshToken;
      player = new window.Spotify.Player({
        name: "TuneTrack",
        volume: 0.8,
        getOAuthToken: (cb) => {
          const accessToken = initialToken;
          initialToken = null;
          if (accessToken) return cb(accessToken);
          void acquireAccessToken().then((nextToken) => {
            if (!disposed && nextToken) cb(nextToken);
          });
        },
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK initialization error:", message);
      });
      player.addListener("authentication_error", ({ message }) => {
        console.error("[TuneTrack] Spotify SDK authentication error:", message);
        if (disposed || authRetryUsed || !player) return;
        authRetryUsed = true;
        void requestToken().then(async (accessToken) => {
          if (!accessToken || disposed || !player) return;
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
        handlersRef.current.onPlaybackError();
      });
      player.addListener("autoplay_failed", () => {
        console.warn("[TuneTrack] Spotify SDK autoplay failed — needs a user gesture");
        handlersRef.current.onAutoplayFailed();
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
        handlersRef.current.onStateChange(state);
      });

      let connectTimeoutId = 0;
      const isConnected = await Promise.race([
        player.connect(),
        new Promise<false>((resolve) => {
          connectTimeoutId = window.setTimeout(() => resolve(false), PLAYER_CONNECT_TIMEOUT_MS);
        }),
      ]).finally(() => window.clearTimeout(connectTimeoutId));
      if (disposed || !isConnected) {
        player.disconnect();
        if (!disposed) throw new Error("Spotify player did not connect");
        return;
      }
      playerRef.current = player;
    }

    // Every failure here used to be terminal: the player was never built and nothing re-ran
    // the effect, so the host was left with controls that could not reach Spotify at all.
    async function boot() {
      for (let attempt = 0; !disposed; attempt += 1) {
        try {
          await init();
          return;
        } catch (error: unknown) {
          if (disposed) return;
          console.error("[TuneTrack] Spotify SDK: initialization failed, retrying", error);
          await waitBeforeRetry(retryDelayFor(attempt));
        }
      }
    }

    void boot();

    return () => {
      disposed = true;
      if (bootWaitTimeoutId !== null) {
        window.clearTimeout(bootWaitTimeoutId);
        bootWaitTimeoutId = null;
      }
      releaseBootWait?.();
      releaseBootWait = null;
      void unregisterDevice();
      void player?.pause().catch(() => undefined);
      player?.disconnect();
      playerRef.current = null;
      clearPendingTokenRequest();
      deviceIdRef.current = null;
      setIsReady(false);
      setDeviceId(null);
      handlersRef.current.onTeardown();
    };
  }, [enabled, playbackGeneration, playerEpoch, requestToken, clearPendingTokenRequest, roomId]);

  return { isReady, deviceId, playerRef, deviceIdRef, requestPlayerRecovery, rebuildPlayer };
}
