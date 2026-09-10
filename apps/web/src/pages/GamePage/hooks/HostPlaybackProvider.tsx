import type { PublicRoomState } from "@tunetrack/shared";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useHostPlayback, type HostPlaybackState } from "./useHostPlayback";

const HostPlaybackContext = createContext<HostPlaybackState | null>(null);

const disabledPlayback: HostPlaybackState = {
  isReady: false,
  isPlaying: false,
  position: 0,
  duration: 0,
  unlockPlayback: () => undefined,
  pause: () => undefined,
  resume: () => undefined,
  restart: () => undefined,
  needsUserGesture: false,
  seek: () => undefined,
};

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
  const unlockPlaybackRef = useRef(playback.unlockPlayback);
  unlockPlaybackRef.current = playback.unlockPlayback;
  const restartRef = useRef(playback.restart);
  restartRef.current = playback.restart;
  const needsUserGestureRef = useRef(playback.needsUserGesture);
  needsUserGestureRef.current = playback.needsUserGesture;

  // Arm the Web Playback SDK on every host gesture so later socket-driven
  // track changes (outside the click stack) are still allowed to autoplay.
  useEffect(() => {
    if (!enabled) {
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
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [enabled]);

  return (
    <HostPlaybackContext.Provider value={playback}>{children}</HostPlaybackContext.Provider>
  );
}

export function useHostPlaybackContext(): HostPlaybackState {
  return useContext(HostPlaybackContext) ?? disabledPlayback;
}
