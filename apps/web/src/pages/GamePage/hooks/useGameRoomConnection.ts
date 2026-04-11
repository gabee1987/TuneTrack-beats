import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PlayerIdentityPayload,
  type PublicRoomState,
  type RoomClosedPayload,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { socketClient } from "../../../services/socket/socketClient";
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
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    routeState.currentPlayerId ?? null,
  );
  const [roomState, setRoomState] = useState<PublicRoomState | null>(
    routeState.roomState ?? null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());

  useEffect(() => {
    if (!roomId || !rememberedDisplayName) {
      navigate("/");
      return;
    }

    function handleConnect() {
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
      setErrorMessage(payload.message);
    }

    function handleRoomClosed(_: RoomClosedPayload) {
      navigate("/");
    }

    socketClient.on("connect", handleConnect);
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
      socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
    };
  }, [navigate, playerSessionId, rememberedDisplayName, roomId]);

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
    errorMessage,
    nowEpochMs,
    roomState,
    setErrorMessage,
  };
}
