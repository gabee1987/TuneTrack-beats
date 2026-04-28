import type { PublicRoomState } from "@tunetrack/shared";
import { useEffect, useRef, useState } from "react";
import {
  TOAST_DURATIONS_MS,
  type GamePageToast,
  type GamePageToastType,
} from "../gamePageToast.types";
import { useI18n } from "../../../features/i18n";

interface UseGamePageToastsOptions {
  currentPlayerId: string | null;
  errorKey: number;
  errorMessage: string | null;
  roomState: PublicRoomState | null;
}

interface ActiveToastEntry {
  id: string;
  message: string;
}

export function useGamePageToasts({
  currentPlayerId,
  errorKey,
  errorMessage,
  roomState,
}: UseGamePageToastsOptions): GamePageToast[] {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<GamePageToast[]>([]);
  const idRef = useRef(0);
  const prevPlayersRef = useRef<PublicRoomState["players"]>([]);
  const activeByTypeRef = useRef<Map<GamePageToastType, ActiveToastEntry>>(new Map());

  function removeToast(id: string, type: GamePageToastType) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (activeByTypeRef.current.get(type)?.id === id) {
      activeByTypeRef.current.delete(type);
    }
  }

  function pushToast(type: GamePageToastType, message: string) {
    const existing = activeByTypeRef.current.get(type);

    if (existing && existing.message === message) {
      // Same toast already visible — reset dismiss timer silently, no visual change
      const timer = setTimeout(() => removeToast(existing.id, type), TOAST_DURATIONS_MS[type]);
      return timer;
    }

    idRef.current += 1;
    const id = String(idRef.current);
    activeByTypeRef.current.set(type, { id, message });
    setToasts((prev) => [...prev.filter((t) => t.type !== type), { id, type, message }]);
    const timer = setTimeout(() => removeToast(id, type), TOAST_DURATIONS_MS[type]);
    return timer;
  }

  useEffect(() => {
    if (!errorMessage) return;
    const timer = pushToast("error", errorMessage);
    return () => clearTimeout(timer);
  }, [errorKey]);

  useEffect(() => {
    if (!roomState) {
      prevPlayersRef.current = [];
      return;
    }

    const prevPlayers = prevPlayersRef.current;
    prevPlayersRef.current = roomState.players;

    for (const player of roomState.players) {
      if (player.id === currentPlayerId) continue;
      const prev = prevPlayers.find((p) => p.id === player.id);
      if (prev?.connectionStatus === "disconnected" && player.connectionStatus === "connected") {
        const timer = pushToast(
          "success",
          t("game.toast.reconnected", { playerName: player.displayName }),
        );
        return () => clearTimeout(timer);
      }
    }
  }, [roomState, currentPlayerId]);

  return toasts;
}
