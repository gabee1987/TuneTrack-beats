import {
  ClientToServerEvent,
  type PublicRoomSummary,
  type RoomListPayload,
  ServerToClientEvent,
} from "@tunetrack/shared/client";
import { useEffect, useState } from "react";
import { getSocketClient } from "../../services/socket/socketClient";

interface UseRoomDirectoryResult {
  /** False until the first list arrives, so a loading list is not shown as empty. */
  hasLoaded: boolean;
  rooms: PublicRoomSummary[];
}

export function useRoomDirectory(): UseRoomDirectoryResult {
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;

    void getSocketClient().then((socketClient) => {
      if (isDisposed) return;

      function handleRoomList(payload: RoomListPayload) {
        setRooms(payload.rooms);
        setHasLoaded(true);
      }

      function requestRoomList() {
        socketClient.emit(ClientToServerEvent.ListRooms);
      }

      socketClient.on(ServerToClientEvent.RoomList, handleRoomList);
      socketClient.on("connect", requestRoomList);
      cleanupSocketListeners = () => {
        socketClient.off(ServerToClientEvent.RoomList, handleRoomList);
        socketClient.off("connect", requestRoomList);
      };

      if (!socketClient.connected) {
        socketClient.connect();
      } else {
        requestRoomList();
      }
    });

    return () => {
      isDisposed = true;
      cleanupSocketListeners?.();
    };
  }, []);

  // The server pushes every change to the list while this page watches it.
  return { hasLoaded, rooms };
}
