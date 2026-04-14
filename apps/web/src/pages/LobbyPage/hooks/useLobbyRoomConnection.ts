import {
  ClientToServerEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type RoomClosedPayload,
  type ServerErrorPayload,
  ServerToClientEvent,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";
import { socketClient } from "../../../services/socket/socketClient";

interface UseLobbyRoomConnectionOptions {
  displayName: string;
  navigate: NavigateFunction;
  playerSessionId: string;
  roomId: string | undefined;
}

interface UseLobbyRoomConnectionResult {
  connectionStatus: string;
  currentPlayerId: string | null;
  errorMessage: string | null;
  roomState: PublicRoomState | null;
}

export function useLobbyRoomConnection({
  displayName,
  navigate,
  playerSessionId,
  roomId,
}: UseLobbyRoomConnectionOptions): UseLobbyRoomConnectionResult {
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !displayName) {
      navigate("/");
      return;
    }

    rememberPlayerDisplayName(displayName);

    function handleConnect() {
      setConnectionStatus("Connected");
      setErrorMessage(null);
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        displayName,
        roomId,
        sessionId: playerSessionId,
      });
    }

    function handleDisconnect() {
      setConnectionStatus("Disconnected");
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);

      if (payload.roomState.status !== "lobby") {
        navigate(`/game/${encodeURIComponent(payload.roomState.roomId)}`, {
          state: {
            currentPlayerId: currentPlayerIdRef.current,
            roomState: payload.roomState,
          },
        });
      }
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      currentPlayerIdRef.current = payload.playerId;
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    function handleRoomClosed(_: RoomClosedPayload) {
      navigate("/");
    }

    socketClient.on("connect", handleConnect);
    socketClient.on("disconnect", handleDisconnect);
    socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
    socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);
    socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
    socketClient.on(ServerToClientEvent.Error, handleError);

    if (!socketClient.connected) {
      socketClient.connect();
    } else {
      handleConnect();
    }

    return () => {
      socketClient.off("connect", handleConnect);
      socketClient.off("disconnect", handleDisconnect);
      socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
    };
  }, [displayName, navigate, playerSessionId, roomId]);

  return {
    connectionStatus,
    currentPlayerId,
    errorMessage,
    roomState,
  };
}
