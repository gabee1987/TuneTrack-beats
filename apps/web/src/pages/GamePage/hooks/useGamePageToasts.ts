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
  timer: number;
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
  const timersRef = useRef<Set<number>>(new Set());

  function removeToast(id: string, type: GamePageToastType) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const activeToast = activeByTypeRef.current.get(type);
    if (activeToast?.id === id) {
      timersRef.current.delete(activeToast.timer);
      activeByTypeRef.current.delete(type);
    }
  }

  function scheduleToastRemoval(id: string, type: GamePageToastType) {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      removeToast(id, type);
    }, TOAST_DURATIONS_MS[type]);

    timersRef.current.add(timer);
    return timer;
  }

  function pushToast(type: GamePageToastType, message: string) {
    const existing = activeByTypeRef.current.get(type);

    if (existing && existing.message === message) {
      window.clearTimeout(existing.timer);
      timersRef.current.delete(existing.timer);
      const timer = scheduleToastRemoval(existing.id, type);
      activeByTypeRef.current.set(type, { ...existing, timer });
      return;
    }

    if (existing) {
      window.clearTimeout(existing.timer);
      timersRef.current.delete(existing.timer);
    }

    idRef.current += 1;
    const id = String(idRef.current);
    setToasts((prev) => [...prev.filter((t) => t.type !== type), { id, type, message }]);
    const timer = scheduleToastRemoval(id, type);
    activeByTypeRef.current.set(type, { id, message, timer });
  }

  useEffect(() => {
    if (!errorMessage) return;
    pushToast("error", errorMessage);
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
        pushToast(
          "success",
          t("game.toast.reconnected", { playerName: player.displayName }),
        );
        return;
      }
    }
  }, [roomState, currentPlayerId]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
      activeByTypeRef.current.clear();
    };
  }, []);

  return toasts;
}
