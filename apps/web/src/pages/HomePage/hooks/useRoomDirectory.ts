import {
  ClientToServerEvent,
  type PublicRoomSummary,
  ServerToClientEvent,
  type RoomListPayload,
} from "@tunetrack/shared";
import { useEffect, useState } from "react";
import { getSocketClient } from "../../../services/socket/socketClient";

interface UseRoomDirectoryResult {
  rooms: PublicRoomSummary[];
  refreshRooms: () => void;
}

export function useRoomDirectory(): UseRoomDirectoryResult {
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);

  useEffect(() => {
    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;

    void getSocketClient().then((socketClient) => {
      if (isDisposed) return;

      function handleRoomList(payload: RoomListPayload) {
        setRooms(payload.rooms);
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

  function refreshRooms() {
    void getSocketClient().then((socketClient) => {
      socketClient.emit(ClientToServerEvent.ListRooms);
    });
  }

  return { refreshRooms, rooms };
}
