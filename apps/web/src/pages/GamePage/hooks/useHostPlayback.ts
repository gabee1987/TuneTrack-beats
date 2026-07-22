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

  const sdk = useSpotifyPlaybackSdk({ roomId, enabled: enabled && isPremium });
  const {
    isReady: sdkReady,
    isPlaying: sdkIsPlaying,
    position: sdkPosition,
    duration: sdkDuration,
    unlockPlayback: sdkUnlockPlayback,
    playTrack,
    pause: sdkPause,
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

  // Premium: auto-play when the track URI changes. Only mark success after the
  // SDK reports audible playback for that URI (server accept alone is not enough).
  const lastConfirmedUriRef = useRef<string | null>(null);
  const playInFlightUriRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      lastConfirmedUriRef.current = null;
      playInFlightUriRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isPremium || !sdkReady) return;
    const uri = roomState?.currentTrackCard?.spotifyTrackUri ?? null;
    if (!uri || uri === lastConfirmedUriRef.current || uri === playInFlightUriRef.current) {
      return;
    }

    let cancelled = false;
    const retryTimeoutIds: number[] = [];
    const retryDelaysMs = [0, 1500, 3500];

    playInFlightUriRef.current = uri;

    async function attemptPlayWithRetries() {
      for (let attemptIndex = 0; attemptIndex < retryDelaysMs.length; attemptIndex += 1) {
        const delayMs = retryDelaysMs[attemptIndex] ?? 0;
        if (delayMs > 0) {
          await new Promise<void>((resolve) => {
            const timeoutId = window.setTimeout(resolve, delayMs);
            retryTimeoutIds.push(timeoutId);
          });
        }
        if (cancelled) {
          return;
        }

        const success = await playTrack(uri!);
        if (cancelled) {
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
      for (const timeoutId of retryTimeoutIds) {
        window.clearTimeout(timeoutId);
      }
      if (playInFlightUriRef.current === uri) {
        playInFlightUriRef.current = null;
      }
    };
  }, [enabled, isPremium, sdkReady, playTrack, roomState?.currentTrackCard?.spotifyTrackUri]);

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
      // Explicit Play is a user gesture — always (re)request the current URI so
      // we recover from failed auto-play track switches, not just unpause.
      const uri = currentUriRef.current;
      if (uri) {
        void playTrack(uri).then((success) => {
          if (success) {
            lastConfirmedUriRef.current = uri;
          }
        });
        return;
      }
    } else {
      void audioRef.current?.play().catch(() => undefined);
    }
  }, [isPremium, playTrack]);

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
