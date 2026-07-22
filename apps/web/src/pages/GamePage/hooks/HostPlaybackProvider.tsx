import type { PublicRoomState } from "@tunetrack/shared";
import { createContext, useContext, type ReactNode } from "react";
import { useHostPlayback, type HostPlaybackState } from "./useHostPlayback";

const HostPlaybackContext = createContext<HostPlaybackState | null>(null);

const disabledPlayback: HostPlaybackState = {
  isReady: false,
  isPlaying: false,
  position: 0,
  duration: 0,
  pause: () => undefined,
  resume: () => undefined,
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
    roomState.hostId === currentPlayerId &&
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

  return (
    <HostPlaybackContext.Provider value={playback}>{children}</HostPlaybackContext.Provider>
  );
}

export function useHostPlaybackContext(): HostPlaybackState {
  return useContext(HostPlaybackContext) ?? disabledPlayback;
}
