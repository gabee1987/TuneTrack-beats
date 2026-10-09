import { useCallback, useState } from "react";
import { createPlayConfirmation } from "./spotifyPlayback/spotifyPlayConfirmation";
import {
  useSpotifyPlaybackState,
  type SpotifyPlaybackSnapshot,
} from "./spotifyPlayback/useSpotifyPlaybackState";
import { useSpotifyPlayerLifecycle } from "./spotifyPlayback/useSpotifyPlayerLifecycle";
import { useSpotifyPlayRequest, type PlayTrack } from "./spotifyPlayback/useSpotifyPlayRequest";
import { useSpotifyToken } from "./spotifyPlayback/useSpotifyToken";

interface UseSpotifyPlaybackSdkOptions {
  roomId: string;
  enabled: boolean;
  playbackGeneration: number;
}

export interface UseSpotifyPlaybackSdkResult extends SpotifyPlaybackSnapshot {
  isReady: boolean;
  deviceId: string | null;
  unlockPlayback: () => void;
  playTrack: PlayTrack;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
}

/**
 * The host's Spotify Web Playback device. A closed room needs no handling here: the room
 * connection navigates away, and the unmount pauses, disconnects and unregisters the device.
 */
export function useSpotifyPlaybackSdk({
  roomId,
  enabled,
  playbackGeneration,
}: UseSpotifyPlaybackSdkOptions): UseSpotifyPlaybackSdkResult {
  const playback = useSpotifyPlaybackState();
  const token = useSpotifyToken({ roomId, enabled });
  const [confirmation] = useState(createPlayConfirmation);
  const { applyPlayerState, resetPlaybackState, setNeedsUserGestureFlag, markPaused } = playback;

  const player = useSpotifyPlayerLifecycle({
    roomId,
    enabled,
    playbackGeneration,
    token,
    handlers: {
      onStateChange: (state) => {
        applyPlayerState(state);
        confirmation.confirmIfAudible(state);
      },
      onPlaybackError: () => confirmation.fail(),
      onAutoplayFailed: () => {
        setNeedsUserGestureFlag(true);
        confirmation.fail();
      },
      onTeardown: () => {
        confirmation.fail();
        resetPlaybackState();
      },
    },
  });
  const { playerRef } = player;

  const playTrack = useSpotifyPlayRequest({
    roomId,
    enabled,
    playbackGeneration,
    player,
    playback,
    confirmation,
  });

  const unlockPlayback = useCallback(() => {
    void playerRef.current?.activateElement().catch(() => undefined);
  }, [playerRef]);

  const pause = useCallback(() => {
    void playerRef.current?.pause().catch(() => undefined);
    markPaused();
  }, [markPaused, playerRef]);

  const resume = useCallback(() => {
    void playerRef.current?.activateElement().catch(() => undefined);
    void playerRef.current?.resume();
  }, [playerRef]);

  const seek = useCallback(
    (positionMs: number) => {
      void playerRef.current?.seek(positionMs);
    },
    [playerRef],
  );

  return {
    ...playback.snapshot,
    isReady: player.isReady,
    deviceId: player.deviceId,
    unlockPlayback,
    playTrack,
    pause,
    resume,
    seek,
  };
}
