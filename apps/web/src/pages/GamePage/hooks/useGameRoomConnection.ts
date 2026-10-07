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
import type { ClosedRoomReason } from "../../../features/ui/RoomResetModal";
import { rememberRoomEventToast } from "../../../services/session/roomEventToast";
import { hasServerRestarted } from "../../../services/socket/connectionState";
import { getSocketClient, resetSocketClient } from "../../../services/socket/socketClient";
import type { GameRouteState } from "../GamePage.types";
import { reuseUnchangedReferences } from "../reuseUnchangedReferences";

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
  const translateRef = useRef(t);
  translateRef.current = t;
  // useNavigate returns a new function on every location change; as an effect dependency it
  // would re-run the join for the same room.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    routeState.currentPlayerId ?? null,
  );
  const [roomState, setRoomState] = useState<PublicRoomState | null>(routeState.roomState ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const errorKeyRef = useRef(0);
  const [hasClosedRoomReset, setHasClosedRoomReset] = useState(false);
  const [closedRoomReason, setClosedRoomReason] = useState<ClosedRoomReason>("closed");

  function showErrorToast(message: string) {
    errorKeyRef.current += 1;
    setErrorKey(errorKeyRef.current);
    setErrorMessage(message);
  }

  function showOfflineActionRefusal() {
    showErrorToast(translateRef.current("room.connection.actionRefusedOffline"));
  }

  function handleClosedRoomReset() {
    setHasClosedRoomReset(false);
    resetSocketClient();
    setRoomState(null);
    setCurrentPlayerId(null);
    navigate("/", { replace: true, state: null });
  }

  useEffect(() => {
    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;

    if (!roomId || !rememberedDisplayName) {
      navigateRef.current("/");
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
      setRoomState((previousRoomState) =>
        reuseUnchangedReferences(previousRoomState, payload.roomState),
      );
      setErrorMessage(null);
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      if (isClosedRoomError(payload.code)) {
        setClosedRoomReason(hasServerRestarted() ? "server_restarted" : "closed");
        setHasClosedRoomReset(true);
        setErrorMessage(null);
        return;
      }

      // Deferred Spotify token refreshes are transient (reconnect race) and self-heal via
      // the SDK's retry cadence — never surface them as a room error.
      if (payload.code === "SPOTIFY_TOKEN_REFRESH_DEFERRED") {
        return;
      }

      showErrorToast(localizeServerError(translateRef.current, payload));
    }

    function handleRoomClosed(payload: RoomClosedPayload) {
      if (payload.reason === "kicked") {
        rememberRoomEventToast({
          reason: payload.reason,
          roomName: payload.roomName ?? payload.roomId,
        });
      }

      resetSocketClient();
      navigateRef.current("/", {
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
  }, [playerSessionId, rememberedDisplayName, roomId]);

  return {
    closedRoomReason,
    currentPlayerId,
    errorKey,
    errorMessage,
    handleClosedRoomReset,
    hasClosedRoomReset,
    roomState,
    setErrorMessage,
    showOfflineActionRefusal,
  };
}

function isClosedRoomError(errorCode: string): boolean {
  return errorCode === "ROOM_NOT_FOUND" || errorCode === "ROOM_MEMBERSHIP_NOT_FOUND";
}
