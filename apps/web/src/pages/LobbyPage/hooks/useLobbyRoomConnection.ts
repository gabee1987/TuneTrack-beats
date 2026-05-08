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
import {
  rememberPlayerDisplayName,
  resetPlayerSession,
} from "../../../services/session/playerSession";
import { rememberRoomEventToast } from "../../../services/session/roomEventToast";
import {
  disconnectSocketClient,
  getSocketClient,
  resetSocketClient,
} from "../../../services/socket/socketClient";

interface UseLobbyRoomConnectionOptions {
  displayName: string;
  intent: "create" | "join";
  navigate: NavigateFunction;
  playerSessionId: string;
  roomId: string | undefined;
}

interface UseLobbyRoomConnectionResult {
  hasClosedRoomReset: boolean;
  connectionStatus: string;
  currentPlayerId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  handleClosedRoomReset: () => void;
  roomState: PublicRoomState | null;
}

interface LobbyRoomStateUpdateDecisionOptions {
  joinedRoomId: string | null;
  nextRoomId: string;
  nextStatus: PublicRoomState["status"];
  requestedRoomId: string | undefined;
}

export function getLobbyRoomStateUpdateDecision({
  joinedRoomId,
  nextRoomId,
  nextStatus,
  requestedRoomId,
}: LobbyRoomStateUpdateDecisionOptions): {
  accept: boolean;
  shouldNavigateToRoom: boolean;
} {
  const isStateForRequestedRoom = nextRoomId === requestedRoomId;
  const isRenameFromJoinedRoom =
    nextStatus === "lobby" &&
    joinedRoomId === requestedRoomId &&
    !isStateForRequestedRoom;

  return {
    accept: isStateForRequestedRoom || isRenameFromJoinedRoom,
    shouldNavigateToRoom: isRenameFromJoinedRoom,
  };
}

export function useLobbyRoomConnection({
  displayName,
  intent,
  navigate,
  playerSessionId,
  roomId,
}: UseLobbyRoomConnectionOptions): UseLobbyRoomConnectionResult {
  const { t } = useI18n();
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const hasNavigatedToGameRef = useRef(false);
  const joinedRoomIdRef = useRef<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasClosedRoomReset, setHasClosedRoomReset] = useState(false);

  function handleClosedRoomReset() {
    setHasClosedRoomReset(false);
    resetSocketClient();
    resetPlayerSession();
    setRoomState(null);
    setCurrentPlayerId(null);
    currentPlayerIdRef.current = null;
    navigate("/", { replace: true, state: null });
  }

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
      socketClient.emit(intent === "create" ? ClientToServerEvent.CreateRoom : ClientToServerEvent.JoinRoom, {
        displayName,
        roomId,
        sessionId: playerSessionId,
      });
    }

    function handleDisconnect() {
      setConnectionStatus("Disconnected");
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      const updateDecision = getLobbyRoomStateUpdateDecision({
        joinedRoomId: joinedRoomIdRef.current,
        nextRoomId: payload.roomState.roomId,
        nextStatus: payload.roomState.status,
        requestedRoomId: roomId,
      });

      if (!updateDecision.accept) {
        return;
      }

      joinedRoomIdRef.current = payload.roomState.roomId;
      setRoomState(payload.roomState);

      if (updateDecision.shouldNavigateToRoom) {
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
      if (isClosedRoomError(payload.code)) {
        setHasClosedRoomReset(true);
        setErrorCode(null);
        setErrorMessage(null);
        return;
      }

      setErrorCode(payload.code);
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
  }, [displayName, intent, navigate, playerSessionId, roomId, t]);

  return {
    hasClosedRoomReset,
    connectionStatus,
    currentPlayerId,
    errorCode,
    errorMessage,
    handleClosedRoomReset,
    roomState,
  };
}

function isClosedRoomError(errorCode: string): boolean {
  return errorCode === "ROOM_NOT_FOUND" || errorCode === "ROOM_MEMBERSHIP_NOT_FOUND";
}
