const PLAYBACK_CONFIRM_TIMEOUT_MS = 10_000;

/**
 * The server accepting a play only means Spotify took the command; the play counts once the
 * device itself reports that track as audible. One confirmation is pending at a time, and
 * only for the most recent play request.
 */
export interface PlayConfirmation {
  /** Makes `requestId` the only play a device report may confirm. */
  begin(requestId: string): void;
  isCurrent(requestId: string): boolean;
  /** Resolves `true` once the device plays `uri`, `false` on failure or timeout. */
  waitFor(requestId: string, uri: string): Promise<boolean>;
  confirmIfAudible(state: Spotify.PlaybackState): void;
  fail(): void;
}

interface PendingConfirmation {
  requestId: string;
  uri: string;
  resolve: (success: boolean) => void;
  timeoutId: number;
}

export function createPlayConfirmation(): PlayConfirmation {
  let currentRequestId: string | null = null;
  let pending: PendingConfirmation | null = null;

  function settle(success: boolean) {
    if (!pending) {
      return;
    }
    const settled = pending;
    pending = null;
    window.clearTimeout(settled.timeoutId);
    settled.resolve(success);
  }

  return {
    begin(requestId) {
      currentRequestId = requestId;
    },

    isCurrent(requestId) {
      return currentRequestId === requestId;
    },

    waitFor(requestId, uri) {
      settle(false);

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          if (pending?.requestId === requestId) {
            pending = null;
            console.error("[TuneTrack] Spotify playTrack: timed out waiting for audible playback");
            resolve(false);
          }
        }, PLAYBACK_CONFIRM_TIMEOUT_MS);

        pending = { requestId, uri, resolve, timeoutId };
      });
    },

    confirmIfAudible(state) {
      const trackUri = state.track_window.current_track?.uri ?? null;
      if (
        pending &&
        pending.requestId === currentRequestId &&
        trackUri === pending.uri &&
        !state.paused
      ) {
        settle(true);
      }
    },

    fail() {
      settle(false);
    },
  };
}
