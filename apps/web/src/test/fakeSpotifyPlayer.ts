import { vi } from "vitest";

type PlayerListener = (payload?: unknown) => void;

export interface FakeSpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  uri: string | null;
  hasNextTracks: boolean;
}

export interface FakeSpotifyPlayer {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  activateElement: ReturnType<typeof vi.fn>;
  addListener: (event: string, listener: PlayerListener) => boolean;
  on: (event: string, listener: PlayerListener) => boolean;
  removeListener: (event: string) => boolean;

  /** ---- test controls ---- */

  /** Report the device as ready, which is what triggers device registration. */
  emitReady(deviceId?: string): void;
  emitNotReady(): void;
  emitError(
    event:
      | "initialization_error"
      | "authentication_error"
      | "account_error"
      | "playback_error",
    message?: string,
  ): void;
  emitAutoplayFailed(): void;
  /** Push a full player state through `player_state_changed`. */
  emitState(state: Partial<FakeSpotifyPlayerState>): void;
  /** A track playing normally. */
  emitPlaying(uri: string, position?: number): void;
  /** A track paused part-way through, which is what causes mid-song resumes. */
  emitPausedMidTrack(uri: string, position: number): void;
  /**
   * End of a single-URI context, shape A: paused at position 0 with an empty queue.
   * Both shapes occur depending on SDK version, so both must be handled.
   */
  emitEndedAtZero(uri: string): void;
  /** End of context, shape B: paused with position at or beyond duration. */
  emitEndedAtDuration(uri: string): void;
  /** Make `activateElement` reject, as a browser does without a user gesture. */
  blockActivateElement(): void;
  allowActivateElement(): void;
}

const DEFAULT_DURATION = 180_000;

export function createFakeSpotifyPlayer(): FakeSpotifyPlayer {
  const listeners = new Map<string, Set<PlayerListener>>();
  let activateElementBlocked = false;

  function listenersFor(event: string): Set<PlayerListener> {
    const existing = listeners.get(event);
    if (existing) {
      return existing;
    }
    const created = new Set<PlayerListener>();
    listeners.set(event, created);
    return created;
  }

  function deliver(event: string, payload?: unknown): void {
    for (const listener of [...listenersFor(event)]) {
      listener(payload);
    }
  }

  function buildState(state: Partial<FakeSpotifyPlayerState>) {
    const resolved: FakeSpotifyPlayerState = {
      paused: false,
      position: 0,
      duration: DEFAULT_DURATION,
      uri: null,
      hasNextTracks: false,
      ...state,
    };

    return {
      paused: resolved.paused,
      position: resolved.position,
      duration: resolved.duration,
      track_window: {
        current_track: resolved.uri ? { uri: resolved.uri } : null,
        next_tracks: resolved.hasNextTracks ? [{ uri: "spotify:track:TEST_NEXT" }] : [],
        previous_tracks: [],
      },
    };
  }

  const player: FakeSpotifyPlayer = {
    connect: vi.fn(() => Promise.resolve(true)),
    disconnect: vi.fn(),
    pause: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    seek: vi.fn(() => Promise.resolve()),
    activateElement: vi.fn(() =>
      activateElementBlocked
        ? Promise.reject(new Error("user gesture required"))
        : Promise.resolve(),
    ),

    addListener(event, listener) {
      listenersFor(event).add(listener);
      return true;
    },

    on(event, listener) {
      listenersFor(event).add(listener);
      return true;
    },

    removeListener(event) {
      listeners.delete(event);
      return true;
    },

    emitReady(deviceId = "TEST_DEVICE_1") {
      deliver("ready", { device_id: deviceId });
    },

    emitNotReady() {
      deliver("not_ready", { device_id: "TEST_DEVICE_1" });
    },

    emitError(event, message = "test failure") {
      deliver(event, { message });
    },

    emitAutoplayFailed() {
      deliver("autoplay_failed");
    },

    emitState(state) {
      deliver("player_state_changed", buildState(state));
    },

    emitPlaying(uri, position = 0) {
      player.emitState({ paused: false, position, uri });
    },

    emitPausedMidTrack(uri, position) {
      player.emitState({ paused: true, position, uri });
    },

    emitEndedAtZero(uri) {
      player.emitState({ paused: true, position: 0, uri, hasNextTracks: false });
    },

    emitEndedAtDuration(uri) {
      player.emitState({
        paused: true,
        position: DEFAULT_DURATION,
        duration: DEFAULT_DURATION,
        uri,
        hasNextTracks: false,
      });
    },

    blockActivateElement() {
      activateElementBlocked = true;
    },

    allowActivateElement() {
      activateElementBlocked = false;
    },
  };

  return player;
}

/**
 * Installs `window.Spotify` and resolves the SDK-ready callback, so the hook's
 * `loadSdkScript` short-circuits instead of injecting a script tag.
 */
export function installFakeSpotifySdk(player: FakeSpotifyPlayer): void {
  Object.defineProperty(window, "Spotify", {
    configurable: true,
    writable: true,
    value: {
      Player: vi.fn(() => player),
    },
  });
}

export function uninstallFakeSpotifySdk(): void {
  Reflect.deleteProperty(window, "Spotify");
  Reflect.deleteProperty(window, "onSpotifyWebPlaybackSDKReady");
}
