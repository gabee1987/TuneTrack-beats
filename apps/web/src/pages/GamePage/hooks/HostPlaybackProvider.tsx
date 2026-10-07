import type { PublicRoomState } from "@tunetrack/shared/client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useHostPlayback, type HostPlaybackState } from "./useHostPlayback";

export type HostPlaybackControls = Pick<
  HostPlaybackState,
  "isReady" | "needsUserGesture" | "pause" | "restart" | "resume" | "seek" | "unlockPlayback"
>;

export type HostPlaybackProgress = Pick<
  HostPlaybackState,
  "duration" | "isPlaying" | "position" | "positionUpdatedAtMs"
>;

const noop = () => undefined;

const disabledControls: HostPlaybackControls = {
  isReady: false,
  needsUserGesture: false,
  pause: noop,
  restart: noop,
  resume: noop,
  seek: noop,
  unlockPlayback: noop,
};

const disabledProgress: HostPlaybackProgress = {
  duration: 0,
  isPlaying: false,
  position: 0,
  positionUpdatedAtMs: 0,
};

// Split so a progress change re-renders only the playback tab, never a controls consumer.
const HostPlaybackControlsContext = createContext<HostPlaybackControls | null>(null);
const HostPlaybackProgressContext = createContext<HostPlaybackProgress | null>(null);

export function shouldEnableHostPlayback(
  roomState: PublicRoomState | null,
  currentPlayerId: string | null,
): boolean {
  if (!roomState || !currentPlayerId) {
    return false;
  }

  return (
    roomState.settings.spotifyPlaybackOwnerPlayerId === currentPlayerId &&
    roomState.settings.spotifyAuthStatus === "connected" &&
    roomState.settings.playlistImported
  );
}

export function HostPlaybackProvider({
  children,
  enabled,
  roomId,
  roomState,
}: {
  children: ReactNode;
  enabled: boolean;
  roomId: string;
  roomState: PublicRoomState | null;
}) {
  const playback = useHostPlayback({
    enabled,
    roomId,
    roomState,
  });
  const {
    duration,
    isPlaying,
    isReady,
    needsUserGesture,
    pause,
    position,
    positionUpdatedAtMs,
    restart,
    resume,
    seek,
    unlockPlayback,
  } = playback;
  const controls = useMemo<HostPlaybackControls>(
    () => ({ isReady, needsUserGesture, pause, restart, resume, seek, unlockPlayback }),
    [isReady, needsUserGesture, pause, restart, resume, seek, unlockPlayback],
  );
  const progress = useMemo<HostPlaybackProgress>(
    () => ({ duration, isPlaying, position, positionUpdatedAtMs }),
    [duration, isPlaying, position, positionUpdatedAtMs],
  );
  const unlockPlaybackRef = useRef(unlockPlayback);
  unlockPlaybackRef.current = unlockPlayback;
  const restartRef = useRef(restart);
  restartRef.current = restart;
  const needsUserGestureRef = useRef(needsUserGesture);
  needsUserGestureRef.current = needsUserGesture;
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;
  const [isUnlocked, setIsUnlocked] = useState(false);

  // A new player (host transfer, playback generation) has to be unlocked again.
  if (!isReady && isUnlocked) {
    setIsUnlocked(false);
  }

  const isGestureListenerArmed = enabled && (!isUnlocked || needsUserGesture);

  // Arms the Web Playback SDK on a host gesture so later socket-driven track changes
  // (outside the click stack) may autoplay. One gesture on a ready player is enough, so the
  // capture listener goes away until the SDK reports an autoplay block again (05 C6).
  useEffect(() => {
    if (!isGestureListenerArmed) {
      return;
    }

    function handlePointerDown() {
      unlockPlaybackRef.current();
      // Arming alone leaves the blocked track silent: nothing re-issues it, so the host
      // was left tapping a player that would never speak again. This gesture is the first
      // moment the browser would allow it, so spend it.
      if (needsUserGestureRef.current) {
        restartRef.current();
      }
      if (isReadyRef.current) {
        setIsUnlocked(true);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isGestureListenerArmed]);

  return (
    <HostPlaybackControlsContext.Provider value={controls}>
      <HostPlaybackProgressContext.Provider value={progress}>
        {children}
      </HostPlaybackProgressContext.Provider>
    </HostPlaybackControlsContext.Provider>
  );
}

export function useHostPlaybackControls(): HostPlaybackControls {
  return useContext(HostPlaybackControlsContext) ?? disabledControls;
}

export function useHostPlaybackProgress(): HostPlaybackProgress {
  return useContext(HostPlaybackProgressContext) ?? disabledProgress;
}
