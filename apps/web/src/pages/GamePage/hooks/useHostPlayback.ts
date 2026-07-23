import {
  ServerToClientEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocketClient } from "../../../services/socket/socketClient";
import { useSpotifyPlaybackSdk } from "./useSpotifyPlaybackSdk";

export interface HostPlaybackState {
  isReady: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  /** Call from a user gesture so remote track changes can autoplay. */
  unlockPlayback: () => void;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
}

const noop = () => undefined;
const disabled: HostPlaybackState = {
  isReady: false,
  isPlaying: false,
  position: 0,
  duration: 0,
  unlockPlayback: noop,
  pause: noop,
  resume: noop,
  seek: noop,
};

export function useHostPlayback({
  roomId,
  roomState,
  enabled,
}: {
  roomId: string;
  roomState: PublicRoomState | null;
  enabled: boolean;
}): HostPlaybackState {
  const accountType = roomState?.settings.spotifyAccountType ?? null;
  const isPremium = accountType === "premium";
  const isFree = accountType === "free";
  const playbackGeneration = roomState?.settings.spotifyPlaybackGeneration ?? 0;

  const sdk = useSpotifyPlaybackSdk({
    roomId,
    enabled: enabled && isPremium,
    playbackGeneration,
  });
  const {
    isReady: sdkReady,
    deviceId: sdkDeviceId,
    isPlaying: sdkIsPlaying,
    position: sdkPosition,
    duration: sdkDuration,
    hasActiveContext: sdkHasActiveContext,
    unlockPlayback: sdkUnlockPlayback,
    playTrack,
    pause: sdkPause,
    resume: sdkResume,
    seek: sdkSeek,
  } = sdk;

  const currentUriRef = useRef<string | null>(null);
  currentUriRef.current = roomState?.currentTrackCard?.spotifyTrackUri ?? null;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [freeIsPlaying, setFreeIsPlaying] = useState(false);
  const [freePosition, setFreePosition] = useState(0);
  const [freeDuration, setFreeDuration] = useState(0);

  useEffect(() => {
    if (!enabled || !isFree) return;
    const audio = new Audio();
    const onEnded = () => setFreeIsPlaying(false);
    const onPause = () => setFreeIsPlaying(false);
    const onPlay = () => setFreeIsPlaying(true);
    const onTimeUpdate = () => {
      setFreePosition(audio.currentTime * 1000);
      setFreeDuration((audio.duration || 0) * 1000);
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audioRef.current = audio;
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
      setFreeIsPlaying(false);
      setFreePosition(0);
      setFreeDuration(0);
    };
  }, [enabled, isFree]);

  useEffect(() => {
    if (!enabled || !isFree) return;

    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    function handleRoomClosed() {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setFreeIsPlaying(false);
      setFreePosition(0);
      setFreeDuration(0);
    }

    void getSocketClient().then((socketClient) => {
      if (isDisposed) {
        return;
      }

      socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);

      cleanup = () => {
        socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      };
    });

    return () => {
      isDisposed = true;
      cleanup?.();
    };
  }, [enabled, isFree]);

  // Premium: auto-play when the current track URI changes. After host transfer the
  // new Web Playback device can take a while to appear in Spotify Connect.
  const lastConfirmedUriRef = useRef<string | null>(null);
  const playInFlightUriRef = useRef<string | null>(null);
  const lastSdkDeviceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      lastConfirmedUriRef.current = null;
      playInFlightUriRef.current = null;
      lastSdkDeviceIdRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isPremium || !sdkReady || !sdkDeviceId) return;

    if (lastSdkDeviceIdRef.current !== sdkDeviceId) {
      lastSdkDeviceIdRef.current = sdkDeviceId;
      // Device remount recovery only — do not treat host role changes as a replay signal.
      lastConfirmedUriRef.current = null;
      playInFlightUriRef.current = null;
    }

    const uri = roomState?.currentTrackCard?.spotifyTrackUri ?? null;
    if (!uri || uri === lastConfirmedUriRef.current || uri === playInFlightUriRef.current) {
      return;
    }

    let cancelled = false;
    let retryTimeoutId: number | null = null;
    // Keep the same device across retries; server already polls Connect visibility.
    const retryDelaysMs = [0, 2500, 6000];

    playInFlightUriRef.current = uri;

    async function attemptPlayWithRetries() {
      for (let attemptIndex = 0; attemptIndex < retryDelaysMs.length; attemptIndex += 1) {
        const delayMs = retryDelaysMs[attemptIndex] ?? 0;
        if (delayMs > 0) {
          await new Promise<void>((resolve) => {
            retryTimeoutId = window.setTimeout(resolve, delayMs);
          });
        }
        if (cancelled || playInFlightUriRef.current !== uri) {
          return;
        }

        const success = await playTrack(uri!);
        if (cancelled || playInFlightUriRef.current !== uri) {
          return;
        }
        if (success) {
          lastConfirmedUriRef.current = uri;
          playInFlightUriRef.current = null;
          return;
        }
      }

      if (!cancelled && playInFlightUriRef.current === uri) {
        playInFlightUriRef.current = null;
      }
    }

    void attemptPlayWithRetries();

    return () => {
      cancelled = true;
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
      }
      if (playInFlightUriRef.current === uri) {
        playInFlightUriRef.current = null;
      }
    };
  }, [
    enabled,
    isPremium,
    sdkReady,
    sdkDeviceId,
    playTrack,
    roomState?.currentTrackCard?.spotifyTrackUri,
  ]);

  const lastPreviewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !isFree) return;
    const url = roomState?.currentTrackCard?.previewUrl ?? null;
    if (!url || url === lastPreviewUrlRef.current) return;
    lastPreviewUrlRef.current = url;
    if (audioRef.current) {
      audioRef.current.src = url;
      void audioRef.current.play().catch(() => undefined);
    }
  }, [enabled, isFree, roomState?.currentTrackCard?.previewUrl]);

  const unlockPlayback = useCallback(() => {
    if (isPremium) {
      sdkUnlockPlayback();
    }
  }, [isPremium, sdkUnlockPlayback]);

  const pause = useCallback(() => {
    if (isPremium) sdkPause();
    else audioRef.current?.pause();
  }, [isPremium, sdkPause]);

  const resume = useCallback(() => {
    if (isPremium) {
      // True pause/resume when Spotify still has context; only re-request the URI
      // when there is nothing to resume (failed autoplay / empty player).
      if (sdkHasActiveContext) {
        sdkResume();
        return;
      }
      const uri = currentUriRef.current;
      if (uri) {
        void playTrack(uri).then((success) => {
          if (success) {
            lastConfirmedUriRef.current = uri;
          }
        });
      }
      return;
    }
    void audioRef.current?.play().catch(() => undefined);
  }, [isPremium, sdkHasActiveContext, sdkResume, playTrack]);

  const seek = useCallback(
    (positionMs: number) => {
      if (isPremium) sdkSeek(positionMs);
      else if (audioRef.current) audioRef.current.currentTime = positionMs / 1000;
    },
    [isPremium, sdkSeek],
  );

  if (!enabled) return disabled;
  if (isPremium)
    return {
      isReady: sdkReady,
      isPlaying: sdkIsPlaying,
      position: sdkPosition,
      duration: sdkDuration,
      unlockPlayback,
      pause,
      resume,
      seek,
    };
  if (isFree)
    return {
      isReady: true,
      isPlaying: freeIsPlaying,
      position: freePosition,
      duration: freeDuration,
      unlockPlayback,
      pause,
      resume,
      seek,
    };
  return disabled;
}
