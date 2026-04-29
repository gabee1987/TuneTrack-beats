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
import { useI18n } from "../../../features/i18n";
import { localizeServerError } from "../../../features/i18n/localizedErrors";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";
import { getSocketClient } from "../../../services/socket/socketClient";

interface UseLobbyRoomConnectionOptions {
  displayName: string;
  navigate: NavigateFunction;
  playerSessionId: string;
  roomId: string | undefined;
}

interface UseLobbyRoomConnectionResult {
  connectionStatus: string;
  currentPlayerId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  roomState: PublicRoomState | null;
}

export function useLobbyRoomConnection({
  displayName,
  navigate,
  playerSessionId,
  roomId,
}: UseLobbyRoomConnectionOptions): UseLobbyRoomConnectionResult {
  const { t } = useI18n();
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const hasNavigatedToGameRef = useRef(false);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;

    if (!roomId || !displayName) {
      navigate("/");
      return;
    }

    rememberPlayerDisplayName(displayName);

    function handleConnect(socketClient: Awaited<ReturnType<typeof getSocketClient>>) {
      setConnectionStatus("Connected");
      setErrorCode(null);
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

      if (payload.roomState.status === "lobby" && payload.roomState.roomId !== roomId) {
        navigate(
          `/lobby/${encodeURIComponent(payload.roomState.roomId)}?playerName=${encodeURIComponent(
            displayName,
          )}`,
          { replace: true },
        );
        return;
      }

      if (payload.roomState.status !== "lobby" && !hasNavigatedToGameRef.current) {
        hasNavigatedToGameRef.current = true;
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
      setErrorCode(payload.code);
      setErrorMessage(localizeServerError(t, payload));
    }

    function handleRoomClosed(_: RoomClosedPayload) {
      navigate("/");
    }

    void getSocketClient().then((socketClient) => {
      if (isDisposed) {
        return;
      }

      const connectListener = () => handleConnect(socketClient);

      socketClient.on("connect", connectListener);
      socketClient.on("disconnect", handleDisconnect);
      socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.on(ServerToClientEvent.Error, handleError);

      cleanupSocketListeners = () => {
        socketClient.off("connect", connectListener);
        socketClient.off("disconnect", handleDisconnect);
        socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
        socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
        socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
        socketClient.off(ServerToClientEvent.Error, handleError);
      };

      if (!socketClient.connected) {
        socketClient.connect();
      } else {
        handleConnect(socketClient);
      }
    });

    return () => {
      isDisposed = true;
      cleanupSocketListeners?.();
    };
  }, [displayName, navigate, playerSessionId, roomId, t]);

  return {
    connectionStatus,
    currentPlayerId,
    errorCode,
    errorMessage,
    roomState,
  };
}
