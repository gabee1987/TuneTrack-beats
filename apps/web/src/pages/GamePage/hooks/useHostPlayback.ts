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
  /** Play the current track from the beginning, from any state. */
  restart: () => void;
  /** Autoplay was blocked; the next real user gesture has to start the track. */
  needsUserGesture: boolean;
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
  restart: noop,
  needsUserGesture: false,
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
    hasEnded: sdkHasEnded,
    currentTrackUri: sdkCurrentTrackUri,
    needsUserGesture: sdkNeedsUserGesture,
    unlockPlayback: sdkUnlockPlayback,
    playTrack,
    pause: sdkPause,
    resume: sdkResume,
    seek: sdkSeek,
  } = sdk;

  const currentUriRef = useRef<string | null>(null);
  currentUriRef.current = roomState?.currentTrackCard?.spotifyTrackUri ?? null;
  const currentPreviewUrlRef = useRef<string | null>(null);
  currentPreviewUrlRef.current = roomState?.currentTrackCard?.previewUrl ?? null;
  const currentCardIdRef = useRef<string | null>(null);
  currentCardIdRef.current = roomState?.currentTrackCard?.id ?? null;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPreviewCardIdRef = useRef<string | null>(null);
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
      lastPreviewCardIdRef.current = null;
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
  // Keyed on the card rather than the track URI. A playlist can hold the same track twice and
  // a card can come round again, and either way the URI still matched what was last played —
  // so no play was issued, and the device simply carried on with whatever it already held.
  const lastPlayedCardIdRef = useRef<string | null>(null);
  const playInFlightCardIdRef = useRef<string | null>(null);
  const lastSdkDeviceIdRef = useRef<string | null>(null);
  const cancelAutoplayLadderRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!enabled) {
      lastPlayedCardIdRef.current = null;
      playInFlightCardIdRef.current = null;
      lastSdkDeviceIdRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isPremium || !sdkReady || !sdkDeviceId) return;

    if (lastSdkDeviceIdRef.current !== sdkDeviceId) {
      lastSdkDeviceIdRef.current = sdkDeviceId;
      // Device remount recovery only — do not treat host role changes as a replay signal.
      lastPlayedCardIdRef.current = null;
      playInFlightCardIdRef.current = null;
    }

    const cardId = roomState?.currentTrackCard?.id ?? null;
    const uri = roomState?.currentTrackCard?.spotifyTrackUri ?? null;
    if (
      !uri ||
      !cardId ||
      cardId === lastPlayedCardIdRef.current ||
      cardId === playInFlightCardIdRef.current
    ) {
      return;
    }

    let cancelled = false;
    let retryTimeoutId: number | null = null;
    let releaseRetryWait: (() => void) | null = null;
    // Keep the same device across retries; server already polls Connect visibility.
    const retryDelaysMs = [0, 2500, 6000];

    playInFlightCardIdRef.current = cardId;

    // Each attempt bumps the SDK's play generation, so a ladder still running would cancel
    // a play the host asked for by hand. Anything user-initiated stops it first.
    function cancelLadder() {
      cancelled = true;
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
      releaseRetryWait?.();
      releaseRetryWait = null;
      if (playInFlightCardIdRef.current === cardId) {
        playInFlightCardIdRef.current = null;
      }
    }

    cancelAutoplayLadderRef.current = cancelLadder;

    async function attemptPlayWithRetries() {
      for (let attemptIndex = 0; attemptIndex < retryDelaysMs.length; attemptIndex += 1) {
        const delayMs = retryDelaysMs[attemptIndex] ?? 0;
        if (delayMs > 0) {
          await new Promise<void>((resolve) => {
            releaseRetryWait = resolve;
            retryTimeoutId = window.setTimeout(resolve, delayMs);
          });
          releaseRetryWait = null;
        }
        if (cancelled || playInFlightCardIdRef.current !== cardId) {
          return;
        }

        const outcome = await playTrack(uri!);
        if (cancelled || playInFlightCardIdRef.current !== cardId) {
          return;
        }
        if (outcome.success) {
          lastPlayedCardIdRef.current = cardId;
          playInFlightCardIdRef.current = null;
          return;
        }
        // Retrying an autoplay block just burns the window in which the host's own tap
        // could have started the track. Only a gesture lifts it.
        if (outcome.needsUserGesture) {
          break;
        }
      }

      if (!cancelled && playInFlightCardIdRef.current === cardId) {
        playInFlightCardIdRef.current = null;
      }
    }

    void attemptPlayWithRetries();

    return () => {
      cancelLadder();
      if (cancelAutoplayLadderRef.current === cancelLadder) {
        cancelAutoplayLadderRef.current = null;
      }
    };
  }, [
    enabled,
    isPremium,
    sdkReady,
    sdkDeviceId,
    playTrack,
    roomState?.currentTrackCard?.id,
    roomState?.currentTrackCard?.spotifyTrackUri,
  ]);

  // Keyed on the card, not on the preview URL: two cards can share a URL, and the same card
  // can come round again, and comparing URLs made both of those silently unplayable.
  const currentCardId = roomState?.currentTrackCard?.id ?? null;
  useEffect(() => {
    if (!enabled || !isFree) return;
    const url = currentPreviewUrlRef.current;
    if (!currentCardId || !url || currentCardId === lastPreviewCardIdRef.current) return;
    lastPreviewCardIdRef.current = currentCardId;
    if (audioRef.current) {
      audioRef.current.src = url;
      void audioRef.current.play().catch(() => undefined);
    }
  }, [enabled, isFree, currentCardId, roomState?.currentTrackCard?.previewUrl]);

  const unlockPlayback = useCallback(() => {
    if (isPremium) {
      sdkUnlockPlayback();
    }
  }, [isPremium, sdkUnlockPlayback]);

  const pause = useCallback(() => {
    if (isPremium) sdkPause();
    else audioRef.current?.pause();
  }, [isPremium, sdkPause]);

  const restart = useCallback(() => {
    if (isPremium) {
      const uri = currentUriRef.current;
      if (!uri) {
        return;
      }
      cancelAutoplayLadderRef.current?.();
      void playTrack(uri, { expectRestart: true }).then((outcome) => {
        if (outcome.success) {
          lastPlayedCardIdRef.current = currentCardIdRef.current;
        }
      });
      return;
    }

    const audio = audioRef.current;
    const previewUrl = currentPreviewUrlRef.current;
    if (!audio || !previewUrl) {
      return;
    }

    // Re-assigning the source rather than seeking to zero, so this recovers a preview that
    // ended, one that was never loaded, and one cleared when a previous room closed.
    audio.src = previewUrl;
    void audio.play().catch(() => undefined);
  }, [isPremium, playTrack]);

  const resume = useCallback(() => {
    if (isPremium) {
      const uri = currentUriRef.current;
      // Resuming is only right while the device is holding the card the room is actually on.
      // `player.resume()` picks up whatever was left loaded, so a card change that Spotify
      // never received came back as the *previous* track continuing from where it stopped —
      // the mid-song start.
      const holdsCurrentCard = !!uri && sdkCurrentTrackUri === uri;

      // True pause/resume only while Spotify still has something to resume. An exhausted
      // single-URI context reports itself as paused, and `player.resume()` on it is a no-op
      // — which is how the host ended up pressing play against silence.
      if (holdsCurrentCard && sdkHasActiveContext && !sdkHasEnded) {
        sdkResume();
        return;
      }
      restart();
      return;
    }

    const audio = audioRef.current;
    const previewUrl = currentPreviewUrlRef.current;
    if (!audio?.src || !previewUrl || audio.src !== previewUrl) {
      restart();
      return;
    }
    void audio.play().catch(() => undefined);
  }, [isPremium, restart, sdkCurrentTrackUri, sdkHasActiveContext, sdkHasEnded, sdkResume]);

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
      restart,
      needsUserGesture: sdkNeedsUserGesture,
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
      restart,
      needsUserGesture: false,
      seek,
    };
  return disabled;
}
