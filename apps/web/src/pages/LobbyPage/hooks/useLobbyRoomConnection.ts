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
import type { ClosedRoomReason } from "../../../features/ui/RoomResetModal";
import { rememberRoomEventToast } from "../../../services/session/roomEventToast";
import { hasServerRestarted } from "../../../services/socket/connectionState";
import { getSocketClient, resetSocketClient } from "../../../services/socket/socketClient";

interface UseLobbyRoomConnectionOptions {
  displayName: string;
  intent: "create" | "join";
  navigate: NavigateFunction;
  playerSessionId: string;
  roomId: string | undefined;
}

interface UseLobbyRoomConnectionResult {
  closedRoomReason: ClosedRoomReason;
  hasClosedRoomReset: boolean;
  currentPlayerId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  handleClosedRoomReset: () => void;
  roomState: PublicRoomState | null;
}

interface LobbyRoomStateUpdateDecisionOptions {
  isCreatingRoom: boolean;
  joinedRoomId: string | null;
  nextRoomId: string;
  nextStatus: PublicRoomState["status"];
  requestedRoomId: string | undefined;
}

export function getLobbyRoomStateUpdateDecision({
  isCreatingRoom,
  joinedRoomId,
  nextRoomId,
  nextStatus,
  requestedRoomId,
}: LobbyRoomStateUpdateDecisionOptions): {
  accept: boolean;
  shouldNavigateToRoom: boolean;
} {
  const isStateForRequestedRoom = nextRoomId === requestedRoomId;
  const isStateForJoinedRoom = requestedRoomId === undefined && nextRoomId === joinedRoomId;
  const isInitialGeneratedRoom =
    isCreatingRoom && requestedRoomId === undefined && joinedRoomId === null;
  const isRenameFromJoinedRoom =
    nextStatus === "lobby" && joinedRoomId === requestedRoomId && !isStateForRequestedRoom;

  return {
    accept:
      isStateForRequestedRoom ||
      isStateForJoinedRoom ||
      isInitialGeneratedRoom ||
      isRenameFromJoinedRoom,
    shouldNavigateToRoom: isInitialGeneratedRoom || isRenameFromJoinedRoom,
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
  const translateRef = useRef(t);
  translateRef.current = t;
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;
  // useNavigate returns a new function on every location change, including this hook's own
  // create-to-lobby redirect; as an effect dependency it would re-run the join.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const hasAttemptedCreateRef = useRef(false);
  const hasNavigatedToGameRef = useRef(false);
  const joinedRoomIdRef = useRef<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasClosedRoomReset, setHasClosedRoomReset] = useState(false);
  const [closedRoomReason, setClosedRoomReason] = useState<ClosedRoomReason>("closed");

  function handleClosedRoomReset() {
    setHasClosedRoomReset(false);
    resetSocketClient();
    setRoomState(null);
    setCurrentPlayerId(null);
    currentPlayerIdRef.current = null;
    navigate("/", { replace: true, state: null });
  }

  useEffect(() => {
    let isDisposed = false;
    let cleanupSocketListeners: (() => void) | null = null;
    hasAttemptedCreateRef.current = false;

    if (!displayName || (intent === "join" && !roomId)) {
      navigateRef.current("/");
      return;
    }

    function handleConnect(socketClient: Awaited<ReturnType<typeof getSocketClient>>) {
      setErrorCode(null);
      setErrorMessage(null);
      const shouldCreateRoom =
        intent === "create" && (!hasAttemptedCreateRef.current || roomId === undefined);
      if (intent === "create") {
        hasAttemptedCreateRef.current = true;
      }
      if (shouldCreateRoom) {
        socketClient.emit(ClientToServerEvent.CreateRoom, {
          displayName: displayNameRef.current,
          ...(roomId ? { roomId } : {}),
          sessionId: playerSessionId,
        });
        return;
      }

      socketClient.emit(ClientToServerEvent.JoinRoom, {
        displayName: displayNameRef.current,
        roomId: roomId!,
        sessionId: playerSessionId,
      });
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      const updateDecision = getLobbyRoomStateUpdateDecision({
        isCreatingRoom: intent === "create",
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
        navigateRef.current(`/lobby/${encodeURIComponent(payload.roomState.roomId)}`, {
          replace: true,
          state: null,
        });
        return;
      }

      if (payload.roomState.status !== "lobby" && !hasNavigatedToGameRef.current) {
        hasNavigatedToGameRef.current = true;
        navigateRef.current(`/game/${encodeURIComponent(payload.roomState.roomId)}`, {
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
        setClosedRoomReason(hasServerRestarted() ? "server_restarted" : "closed");
        setHasClosedRoomReset(true);
        setErrorCode(null);
        setErrorMessage(null);
        return;
      }

      setErrorCode(payload.code);
      setErrorMessage(localizeServerError(translateRef.current, payload));
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
  }, [intent, playerSessionId, roomId]);

  return {
    closedRoomReason,
    hasClosedRoomReset,
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
