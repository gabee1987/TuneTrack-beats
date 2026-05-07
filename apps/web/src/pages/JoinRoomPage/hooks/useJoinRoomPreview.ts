import {
  ClientToServerEvent,
  type PublicRoomSummary,
  ServerToClientEvent,
  type RoomPreviewPayload,
} from "@tunetrack/shared";
import { useEffect, useState } from "react";
import { getSocketClient } from "../../../services/socket/socketClient";

interface UseJoinRoomPreviewResult {
  room: PublicRoomSummary | null;
  status: "loading" | "ready";
}

export function useJoinRoomPreview(roomId: string | undefined): UseJoinRoomPreviewResult {
  const [room, setRoom] = useState<PublicRoomSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    if (!roomId) {
      setStatus("ready");
      setRoom(null);
      return;
    }

    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;

    void getSocketClient().then((socketClient) => {
      if (isDisposed) return;

      function handleRoomPreview(payload: RoomPreviewPayload) {
        if (payload.requestedRoomId !== roomId) return;
        setRoom(payload.room);
        setStatus("ready");
      }

      function requestRoomPreview() {
        setStatus("loading");
        socketClient.emit(ClientToServerEvent.GetRoomPreview, { roomId });
      }

      socketClient.on(ServerToClientEvent.RoomPreview, handleRoomPreview);
      socketClient.on("connect", requestRoomPreview);
      cleanupSocketListeners = () => {
        socketClient.off(ServerToClientEvent.RoomPreview, handleRoomPreview);
        socketClient.off("connect", requestRoomPreview);
      };

      if (!socketClient.connected) {
        socketClient.connect();
      } else {
        requestRoomPreview();
      }
    });

    return () => {
      isDisposed = true;
      cleanupSocketListeners?.();
    };
  }, [roomId]);

  return { room, status };
}
