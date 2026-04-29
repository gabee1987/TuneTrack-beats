const ROOM_EVENT_TOAST_STORAGE_KEY = "tunetrack.roomEventToast";
export const ROOM_EVENT_TOAST_EVENT = "tunetrack:room-event-toast";

export interface KickedRoomEventToast {
  reason: "kicked";
  roomName: string;
}

export type RoomEventToast = KickedRoomEventToast;

export function rememberRoomEventToast(toast: RoomEventToast): void {
  try {
    window.sessionStorage.setItem(ROOM_EVENT_TOAST_STORAGE_KEY, JSON.stringify(toast));
  } catch {
    // Route state and the in-page event below still carry the notification.
  }
  window.dispatchEvent(new CustomEvent<RoomEventToast>(ROOM_EVENT_TOAST_EVENT, { detail: toast }));
}

export function consumeRoomEventToast(): RoomEventToast | null {
  let rawToast: string | null = null;
  try {
    rawToast = window.sessionStorage.getItem(ROOM_EVENT_TOAST_STORAGE_KEY);
    window.sessionStorage.removeItem(ROOM_EVENT_TOAST_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!rawToast) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawToast) as { reason?: unknown; roomName?: unknown };
    if (parsed.reason !== "kicked" || typeof parsed.roomName !== "string") {
      return null;
    }

    return { reason: "kicked", roomName: parsed.roomName };
  } catch {
    return null;
  }
}
