import type { PublicRoomState } from "@tunetrack/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpotifyPlaybackSdk } from "./useSpotifyPlaybackSdk";

export interface HostPlaybackState {
  isReady: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
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
    hasActiveContext,
    playTrack,
    pause: sdkPause,
    resume: sdkResume,
    seek: sdkSeek,
  } = sdk;

  // Keep a stable ref to the current track URI so resume() can use it without a dep
  const currentUriRef = useRef<string | null>(null);
  currentUriRef.current = roomState?.currentTrackCard?.spotifyTrackUri ?? null;

  // Free account: create an Audio element imperatively
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
      audioRef.current = null;
    };
  }, [enabled, isFree]);

  // Premium: auto-play when the track URI changes and the SDK player is ready
  const lastSdkUriRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !isPremium || !sdkReady) return;
    const uri = roomState?.currentTrackCard?.spotifyTrackUri ?? null;
    if (uri && uri !== lastSdkUriRef.current) {
      lastSdkUriRef.current = uri;
      playTrack(uri);
    }
  }, [enabled, isPremium, sdkReady, playTrack, roomState?.currentTrackCard?.spotifyTrackUri]);

  // Free: auto-play when the preview URL changes
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

  const pause = useCallback(() => {
    if (isPremium) sdkPause();
    else audioRef.current?.pause();
  }, [isPremium, sdkPause]);

  const resume = useCallback(() => {
    if (isPremium) {
      if (hasActiveContext) {
        // SDK already has a track loaded — just unpause
        sdkResume();
      } else {
        // No track loaded yet (auto-play may have failed or not fired); start it now
        const uri = currentUriRef.current;
        if (uri) playTrack(uri);
      }
    } else {
      void audioRef.current?.play().catch(() => undefined);
    }
  }, [isPremium, hasActiveContext, sdkResume, playTrack]);

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
      pause,
      resume,
      seek,
    };
  return disabled;
}
