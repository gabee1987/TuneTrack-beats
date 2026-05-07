import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../features/i18n";
import { preloadLobbyRuntime } from "../../../app/preloadRoutes";
import {
  ROOM_EVENT_TOAST_EVENT,
  consumeRoomEventToast,
  type RoomEventToast,
} from "../../../services/session/roomEventToast";
import type { HomePageController } from "../HomePage.types";

export function useHomePageController(): HomePageController {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showRoomEventToast = useCallback(
    (roomEventToast: { reason: "kicked"; roomName: string }) => {
      setToastMessage(
        t("home.toast.kickedFromRoom", { roomName: roomEventToast.roomName }),
      );

      return window.setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    },
    [t],
  );

  useEffect(() => {
    const roomEventToast = consumeRoomEventToast() ?? readRoomEventToast(location.state);
    if (!roomEventToast) {
      return;
    }

    const timeoutId = showRoomEventToast(roomEventToast);
    navigate(".", { replace: true, state: null });

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.state, navigate, showRoomEventToast]);

  useEffect(() => {
    const timeoutIds = new Set<number>();

    function handleRoomEventToast(event: Event) {
      const roomEventToast = (event as CustomEvent<RoomEventToast>).detail;
      if (roomEventToast?.reason !== "kicked") {
        return;
      }

      const timeoutId = showRoomEventToast(roomEventToast);
      timeoutIds.add(timeoutId);
      window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
      }, 4500);
    }

    window.addEventListener(ROOM_EVENT_TOAST_EVENT, handleRoomEventToast);
    return () => {
      window.removeEventListener(ROOM_EVENT_TOAST_EVENT, handleRoomEventToast);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [showRoomEventToast]);

  function handleStart() {
    preloadLobbyRuntime();
    navigate("/play");
  }

  return {
    handleStart,
    preloadLobby: preloadLobbyRuntime,
    toastMessage,
  };
}

function readRoomEventToast(
  state: unknown,
): { reason: "kicked"; roomName: string } | null {
  if (
    !state ||
    typeof state !== "object" ||
    !("roomEventToast" in state) ||
    typeof state.roomEventToast !== "object" ||
    state.roomEventToast === null
  ) {
    return null;
  }

  const toast = state.roomEventToast as { reason?: unknown; roomName?: unknown };
  if (toast.reason !== "kicked" || typeof toast.roomName !== "string") {
    return null;
  }

  return { reason: "kicked", roomName: toast.roomName };
}
