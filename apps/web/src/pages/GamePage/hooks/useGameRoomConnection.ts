import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type RoomClosedPayload,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useI18n } from "../../../features/i18n";
import { localizeServerError } from "../../../features/i18n/localizedErrors";
import { resetPlayerSession } from "../../../services/session/playerSession";
import { rememberRoomEventToast } from "../../../services/session/roomEventToast";
import {
  disconnectSocketClient,
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
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());
  const [hasClosedRoomReset, setHasClosedRoomReset] = useState(false);

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

    function handleConnect(socketClient: Awaited<ReturnType<typeof getSocketClient>>) {
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

      disconnectSocketClient();
      navigate("/", {
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
      socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.on(ServerToClientEvent.Error, handleError);

      cleanupSocketListeners = () => {
        socketClient.off("connect", connectListener);
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

  useEffect(() => {
    if (
      roomState?.status !== "challenge" ||
      !roomState.challengeState?.challengeDeadlineEpochMs
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowEpochMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomState]);

  return {
    currentPlayerId,
    errorKey,
    errorMessage,
    handleClosedRoomReset,
    hasClosedRoomReset,
    nowEpochMs,
    roomState,
    setErrorMessage,
  };
}

function isClosedRoomError(errorCode: string): boolean {
  return errorCode === "ROOM_NOT_FOUND" || errorCode === "ROOM_MEMBERSHIP_NOT_FOUND";
}
