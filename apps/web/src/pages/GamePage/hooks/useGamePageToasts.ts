import type { PublicRoomState } from "@tunetrack/shared/client";
import { useEffect, useRef, useState } from "react";
import { getGuestHandoverMessage } from "../handoverNotices";
import {
  HANDOVER_TOAST_DURATION_MS,
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
  const hasCheckedHandoverRef = useRef(false);

  function removeToast(id: string, type: GamePageToastType) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const activeToast = activeByTypeRef.current.get(type);
    if (activeToast?.id === id) {
      timersRef.current.delete(activeToast.timer);
      activeByTypeRef.current.delete(type);
    }
  }

  function removeActiveToastByType(type: GamePageToastType) {
    const activeToast = activeByTypeRef.current.get(type);
    if (!activeToast) return;

    window.clearTimeout(activeToast.timer);
    timersRef.current.delete(activeToast.timer);
    activeByTypeRef.current.delete(type);
    setToasts((prev) => prev.filter((toast) => toast.id !== activeToast.id));
  }

  function scheduleToastRemoval(id: string, type: GamePageToastType, durationMs: number) {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      removeToast(id, type);
    }, durationMs);

    timersRef.current.add(timer);
    return timer;
  }

  function pushToast(
    type: GamePageToastType,
    message: string,
    durationMs = TOAST_DURATIONS_MS[type],
  ) {
    const existing = activeByTypeRef.current.get(type);

    if (existing && existing.message === message) {
      window.clearTimeout(existing.timer);
      timersRef.current.delete(existing.timer);
      const timer = scheduleToastRemoval(existing.id, type, durationMs);
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
    const timer = scheduleToastRemoval(id, type, durationMs);
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

    // Only the first room state this page sees can be the handover; a later one never is.
    if (currentPlayerId && !hasCheckedHandoverRef.current) {
      hasCheckedHandoverRef.current = true;
      const handoverMessage = getGuestHandoverMessage(roomState, currentPlayerId, t);
      if (handoverMessage) pushToast("info", handoverMessage, HANDOVER_TOAST_DURATION_MS);
    }

    const prevPlayers = prevPlayersRef.current;
    prevPlayersRef.current = roomState.players;

    for (const player of roomState.players) {
      if (player.id === currentPlayerId) continue;
      const prev = prevPlayers.find((p) => p.id === player.id);
      if (prev?.connectionStatus === "connected" && player.connectionStatus === "disconnected") {
        pushToast("info", t("game.toast.disconnected", { playerName: player.displayName }));
        return;
      }

      if (prev?.connectionStatus === "disconnected" && player.connectionStatus === "connected") {
        removeActiveToastByType("info");
        pushToast("success", t("game.toast.reconnected", { playerName: player.displayName }));
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
