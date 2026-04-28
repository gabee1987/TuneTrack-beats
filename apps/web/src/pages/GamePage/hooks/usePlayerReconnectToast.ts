import type { PublicRoomState } from "@tunetrack/shared";
import { useEffect, useRef, useState } from "react";

const TOAST_DISPLAY_MS = 3000;

export interface ReconnectToast {
  key: number;
  playerName: string;
}

export function usePlayerReconnectToast(
  roomState: PublicRoomState | null,
  currentPlayerId: string | null,
): ReconnectToast | null {
  const prevPlayersRef = useRef<PublicRoomState["players"]>([]);
  const keyRef = useRef(0);
  const [activeToast, setActiveToast] = useState<ReconnectToast | null>(null);

  useEffect(() => {
    if (!roomState) {
      prevPlayersRef.current = [];
      return;
    }

    const prevPlayers = prevPlayersRef.current;
    prevPlayersRef.current = roomState.players;

    for (const player of roomState.players) {
      if (player.id === currentPlayerId) continue;
      const prevPlayer = prevPlayers.find((p) => p.id === player.id);
      if (
        prevPlayer?.connectionStatus === "disconnected" &&
        player.connectionStatus === "connected"
      ) {
        keyRef.current += 1;
        const toast: ReconnectToast = { key: keyRef.current, playerName: player.displayName };
        setActiveToast(toast);
        const timer = setTimeout(() => {
          setActiveToast((current) => (current?.key === toast.key ? null : current));
        }, TOAST_DISPLAY_MS);
        return () => clearTimeout(timer);
      }
    }
  }, [roomState, currentPlayerId]);

  return activeToast;
}
