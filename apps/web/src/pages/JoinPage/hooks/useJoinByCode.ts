import {
  ClientToServerEvent,
  ServerToClientEvent,
  type RoomPreviewPayload,
} from "@tunetrack/shared/client";
import { useEffect, useRef, useState } from "react";
import { isPossibleRoomCode } from "../../../features/rooms/roomCode";
import { getSocketClient } from "../../../services/socket/socketClient";

export type JoinByCodeStatus = "idle" | "checking" | "not_found";

interface JoinByCodeResult {
  clearNotFound: () => void;
  status: JoinByCodeStatus;
  /** Looks the code up and calls `onFound` with the room's stored code, in its stored case. */
  submit: (typedCode: string) => void;
}

/**
 * A wrong code is answered on the Join page itself (`22` §4.3), so the code is checked with the
 * same preview the invite page uses before anyone is sent to a lobby.
 */
export function useJoinByCode(onFound: (roomId: string) => void): JoinByCodeResult {
  const [status, setStatus] = useState<JoinByCodeStatus>("idle");
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    [],
  );

  function submit(typedCode: string) {
    const code = typedCode.trim();
    if (!code) return;

    cleanupRef.current?.();
    cleanupRef.current = null;
    // The server answers a malformed code with an error instead of a preview.
    if (!isPossibleRoomCode(code)) {
      setStatus("not_found");
      return;
    }
    setStatus("checking");

    let isCancelled = false;
    cleanupRef.current = () => {
      isCancelled = true;
    };

    void getSocketClient().then((socketClient) => {
      if (isCancelled) return;

      function handlePreview(payload: RoomPreviewPayload) {
        if (payload.requestedRoomId !== code) return;
        socketClient.off(ServerToClientEvent.RoomPreview, handlePreview);
        if (payload.room) {
          setStatus("idle");
          onFoundRef.current(payload.room.roomId);
        } else {
          setStatus("not_found");
        }
      }

      socketClient.on(ServerToClientEvent.RoomPreview, handlePreview);
      cleanupRef.current = () => {
        isCancelled = true;
        socketClient.off(ServerToClientEvent.RoomPreview, handlePreview);
      };
      socketClient.emit(ClientToServerEvent.GetRoomPreview, { roomId: code });
    });
  }

  return {
    clearNotFound: () => setStatus((current) => (current === "not_found" ? "idle" : current)),
    status,
    submit,
  };
}
