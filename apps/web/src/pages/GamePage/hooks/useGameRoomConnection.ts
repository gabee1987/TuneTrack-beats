import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type RoomClosedPayload,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useI18n } from "../../../features/i18n";
import { localizeServerError } from "../../../features/i18n/localizedErrors";
import { resetPlayerSession } from "../../../services/session/playerSession";
import { rememberRoomEventToast } from "../../../services/session/roomEventToast";
import {

  getSocketClient,
  resetSocketClient,
} from "../../../services/socket/socketClient";
import type { GameRouteState } from "../GamePage.types";

interface UseGameRoomConnectionOptions {
  navigate: NavigateFunction;
  roomId: string | undefined;
  routeState: Partial<GameRouteState>;
  playerSessionId: string;
  rememberedDisplayName: string;
}

export function useGameRoomConnection({
  navigate,
  roomId,
  routeState,
  playerSessionId,
  rememberedDisplayName,
}: UseGameRoomConnectionOptions) {
  const { t } = useI18n();
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    routeState.currentPlayerId ?? null,
  );
  const [roomState, setRoomState] = useState<PublicRoomState | null>(
    routeState.roomState ?? null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const errorKeyRef = useRef(0);
  const [hasClosedRoomReset, setHasClosedRoomReset] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * An action the socket could not deliver is dropped rather than buffered, so the only
   * thing left to do is tell the player the board did not move.
   */
  const reportConnectionLost = useCallback(() => {
    errorKeyRef.current += 1;
    setErrorKey(errorKeyRef.current);
    setErrorMessage(t("game.error.connectionLost"));
  }, [t]);

  function handleClosedRoomReset() {
    setHasClosedRoomReset(false);
    resetSocketClient();
    resetPlayerSession();
    setRoomState(null);
    setCurrentPlayerId(null);
    navigate("/", { replace: true, state: null });
  }

  useEffect(() => {
    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;

    if (!roomId || !rememberedDisplayName) {
      navigate("/");
      return;
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    function handleConnect(socketClient: Awaited<ReturnType<typeof getSocketClient>>) {
      setIsConnected(true);
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        roomId,
        displayName: rememberedDisplayName,
        sessionId: playerSessionId,
      });
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);
      setErrorMessage(null);
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      if (isClosedRoomError(payload.code)) {
        setHasClosedRoomReset(true);
        setErrorMessage(null);
        return;
      }

      // Deferred Spotify token refreshes are transient (reconnect race) and self-heal via
      // the SDK's retry cadence — never surface them as a room error.
      if (payload.code === "SPOTIFY_TOKEN_REFRESH_DEFERRED") {
        return;
      }

      errorKeyRef.current += 1;
      setErrorKey(errorKeyRef.current);
      setErrorMessage(localizeServerError(t, payload));
    }

    function handleRoomClosed(payload: RoomClosedPayload) {
      if (payload.reason === "kicked") {
        rememberRoomEventToast({
          reason: payload.reason,
          roomName: payload.roomName ?? payload.roomId,
        });
      }

      resetSocketClient();
      navigate("/", {
        replace: true,
        state:
          payload.reason === "kicked"
            ? {
                roomEventToast: {
                  reason: payload.reason,
                  roomName: payload.roomName ?? payload.roomId,
                },
              }
            : null,
      });
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
  }, [navigate, playerSessionId, rememberedDisplayName, roomId, t]);

  return {
    currentPlayerId,
    errorKey,
    errorMessage,
    handleClosedRoomReset,
    hasClosedRoomReset,
    isConnected,
    reportConnectionLost,
    roomState,
    setErrorMessage,
  };
}

function isClosedRoomError(errorCode: string): boolean {
  return errorCode === "ROOM_NOT_FOUND" || errorCode === "ROOM_MEMBERSHIP_NOT_FOUND";
}
