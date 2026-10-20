import {
  ClientToServerEvent,
  ServerToClientEvent,
  type SpotifyPlaybackResultPayload,
} from "@tunetrack/shared/client";
import { useCallback, useEffect, useRef } from "react";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { PlayConfirmation } from "./spotifyPlayConfirmation";
import type { SpotifyPlaybackState } from "./useSpotifyPlaybackState";
import type { SpotifyPlayerLifecycle } from "./useSpotifyPlayerLifecycle";

const SERVER_PLAY_TIMEOUT_MS = 32_000;

/**
 * `needsUserGesture` travels with the outcome rather than being read from state afterwards,
 * because the caller decides whether to retry the moment the attempt returns, and a state
 * update from the same tick has not landed by then.
 */
export interface PlayAttemptOutcome {
  success: boolean;
  needsUserGesture: boolean;
}

export type PlayTrack = (
  spotifyTrackUri: string,
  options?: { expectRestart?: boolean },
) => Promise<PlayAttemptOutcome>;

function createPlaybackRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `play-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * One play attempt: the server starts the track on this device, then the device has to
 * report it as audible. A newer attempt supersedes an older one at every step.
 */
export function useSpotifyPlayRequest({
  roomId,
  enabled,
  playbackGeneration,
  player,
  playback,
  confirmation,
}: {
  roomId: string;
  enabled: boolean;
  playbackGeneration: number;
  player: SpotifyPlayerLifecycle;
  playback: SpotifyPlaybackState;
  confirmation: PlayConfirmation;
}): PlayTrack {
  const { playerRef, deviceIdRef, requestPlayerRecovery, rebuildPlayer } = player;
  const {
    clearEnded,
    currentTrackUriRef,
    isPlayingRef,
    needsUserGestureRef,
    setNeedsUserGestureFlag,
  } = playback;
  const playbackGenerationRef = useRef(playbackGeneration);
  playbackGenerationRef.current = playbackGeneration;
  const reconnectAttemptsRef = useRef(0);
  const playGenerationRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      reconnectAttemptsRef.current = 0;
    }
  }, [enabled]);

  useEffect(() => {
    reconnectAttemptsRef.current = 0;
  }, [playbackGeneration]);

  const waitForPlayingUri = useCallback(
    (requestId: string, spotifyTrackUri: string, expectRestart: boolean): Promise<boolean> => {
      // The shortcut answers "is this URI audible", which is not the question a restart asks.
      // Reporting an already-playing track as a successful start is how a deliberate replay
      // came back as a no-op.
      const alreadyPlaying =
        !expectRestart && currentTrackUriRef.current === spotifyTrackUri && isPlayingRef.current;
      if (alreadyPlaying) {
        return Promise.resolve(true);
      }

      return confirmation.waitFor(requestId, spotifyTrackUri);
    },
    [confirmation, currentTrackUriRef, isPlayingRef],
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

  return useCallback<PlayTrack>(
    async (spotifyTrackUri, options) => {
      const blocked = (): PlayAttemptOutcome => ({
        success: false,
        needsUserGesture: needsUserGestureRef.current,
      });

      const activeDeviceId = deviceIdRef.current;
      if (!activeDeviceId) {
        console.error("[TuneTrack] Spotify playTrack: player device is not ready");
        requestPlayerRecovery();
        return blocked();
      }

      clearEnded();
      // Cleared up front so a gesture-driven recovery cannot fire twice for one block: the
      // `autoplay_failed` listener raises it again if this attempt is blocked too.
      setNeedsUserGestureFlag(false);

      const playGeneration = playGenerationRef.current + 1;
      playGenerationRef.current = playGeneration;

      const requestId = createPlaybackRequestId();
      confirmation.begin(requestId);

      try {
        await playerRef.current?.activateElement();
      } catch {
        // Gesture may be required; continue.
      }

      if (playGenerationRef.current !== playGeneration) {
        return blocked();
      }

      const serverResult = await requestServerPlay(requestId, spotifyTrackUri, activeDeviceId);
      if (playGenerationRef.current !== playGeneration || !confirmation.isCurrent(requestId)) {
        return blocked();
      }

      if (!serverResult.success) {
        if (
          serverResult.code === "superseded" ||
          serverResult.code === "stale_playback_generation"
        ) {
          return blocked();
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
            rebuildPlayer();
          }
        }

        return blocked();
      }

      reconnectAttemptsRef.current = 0;
      const success = await waitForPlayingUri(
        requestId,
        spotifyTrackUri,
        options?.expectRestart ?? false,
      );
      return { success, needsUserGesture: !success && needsUserGestureRef.current };
    },
    [
      clearEnded,
      confirmation,
      deviceIdRef,
      enabled,
      needsUserGestureRef,
      playerRef,
      rebuildPlayer,
      requestPlayerRecovery,
      requestServerPlay,
      setNeedsUserGestureFlag,
      waitForPlayingUri,
    ],
  );
}
