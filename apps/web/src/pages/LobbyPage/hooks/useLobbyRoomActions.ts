import {
  ClientToServerEvent,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import { getSocketClient } from "../../../services/socket/socketClient";
import type {
  CloseRoomActionStatus,
  LobbyKickPlayerActionState,
  StartGameActionStatus,
} from "../LobbyPage.types";
import { useLobbyKickPlayerAction } from "./useLobbyKickPlayerAction";

const DEFAULT_ENABLED_STARTING_TT_TOKEN_COUNT = 1;

interface UseLobbyRoomActionsOptions {
  currentSettings: PublicRoomSettings;
  isHost: boolean;
  roomState: PublicRoomState | null;
}

interface UseLobbyRoomActionsResult {
  closeRoomActionStatus: CloseRoomActionStatus;
  handleCloseRoom: () => void;
  handlePlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
  handlePlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
  handlePlayerProfileChange: (displayName: string) => void;
  handlePlayerKick: (player: PublicPlayerState) => void;
  handleRoomRename: (nextRoomId: string) => void;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  isCloseRoomPending: boolean;
  isKickPlayerPending: boolean;
  isStartGamePending: boolean;
  kickPlayerActionState: LobbyKickPlayerActionState | null;
  startGameActionStatus: StartGameActionStatus;
  toggleTtMode: (enabled: boolean) => void;
}

export function useLobbyRoomActions({
  currentSettings,
  isHost,
  roomState,
}: UseLobbyRoomActionsOptions): UseLobbyRoomActionsResult {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isCloseRoomPendingRef = useRef(false);
  const [closeRoomActionStatus, setCloseRoomActionStatus] =
    useState<CloseRoomActionStatus>("idle");
  const isStartGamePendingRef = useRef(false);
  const [startGameActionStatus, setStartGameActionStatus] =
    useState<StartGameActionStatus>("idle");
  const isStartGamePending =
    startGameActionStatus === "pending" || startGameActionStatus === "retrying";
  const isCloseRoomPending =
    closeRoomActionStatus === "pending" || closeRoomActionStatus === "retrying";
  const kickPlayerAction = useLobbyKickPlayerAction({ isHost, roomState });

  async function emitRoomEvent<TPayload>(
    event: (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent],
    payload: TPayload,
  ) {
    const socketClient = await getSocketClient();
    socketClient.emit(event, payload);
  }

  function handleRoomSettingsChange(nextSettings: PublicRoomSettings) {
    if (!roomState || !isHost) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.UpdateRoomSettings, {
      roomId: roomState.roomId,
      ...nextSettings,
    });
  }

  function handleRoomRename(nextRoomId: string) {
    if (!roomState || !isHost) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.RenameRoom, {
      nextRoomId,
      roomId: roomState.roomId,
    });
  }

  function handlePlayerStartingCardCountChange(player: PublicPlayerState, nextValue: number) {
    if (!roomState || !isHost) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.UpdatePlayerSettings, {
      playerId: player.id,
      roomId: roomState.roomId,
      startingTimelineCardCount: nextValue,
      startingTtTokenCount: player.ttTokenCount,
    });
  }

  function handlePlayerStartingTtTokenCountChange(player: PublicPlayerState, nextValue: number) {
    if (!roomState || !isHost) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.UpdatePlayerSettings, {
      playerId: player.id,
      roomId: roomState.roomId,
      startingTimelineCardCount: player.startingTimelineCardCount,
      startingTtTokenCount: nextValue,
    });
  }

  function handlePlayerProfileChange(displayName: string) {
    if (!roomState) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.UpdatePlayerProfile, {
      displayName,
      roomId: roomState.roomId,
    });
  }

  async function handleStartGame() {
    if (!roomState || !isHost || isStartGamePendingRef.current) {
      return;
    }

    const submittedRoomId = roomState.roomId;
    const submittedHostId = roomState.hostId;
    function isSubmittedLobbyCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.roomId === submittedRoomId &&
        currentRoomState.status === "lobby" &&
        currentRoomState.hostId === submittedHostId
      );
    }

    isStartGamePendingRef.current = true;
    setStartGameActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.StartGame,
        { roomId: submittedRoomId },
        {
          onTimeoutRetry: () => {
            if (isSubmittedLobbyCurrent()) {
              setStartGameActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setStartGameActionStatus(
        result.status === "timeout" && isSubmittedLobbyCurrent() ? "failed" : "idle",
      );
    } catch {
      setStartGameActionStatus(isSubmittedLobbyCurrent() ? "failed" : "idle");
    } finally {
      isStartGamePendingRef.current = false;
    }
  }

  async function handleCloseRoom() {
    if (!roomState || !isHost || isCloseRoomPendingRef.current) {
      return;
    }

    const submittedRoomId = roomState.roomId;
    const submittedHostId = roomState.hostId;
    function isSubmittedRoomCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.roomId === submittedRoomId &&
        currentRoomState.hostId === submittedHostId
      );
    }

    isCloseRoomPendingRef.current = true;
    setCloseRoomActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.CloseRoom,
        { roomId: submittedRoomId },
        {
          onTimeoutRetry: () => {
            if (isSubmittedRoomCurrent()) {
              setCloseRoomActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setCloseRoomActionStatus(
        result.status === "timeout" && isSubmittedRoomCurrent() ? "failed" : "idle",
      );
    } catch {
      setCloseRoomActionStatus(isSubmittedRoomCurrent() ? "failed" : "idle");
    } finally {
      isCloseRoomPendingRef.current = false;
    }
  }

  function toggleTtMode(enabled: boolean) {
    handleRoomSettingsChange(
      enabled
        ? {
            ...currentSettings,
            startingTtTokenCount: currentSettings.ttModeEnabled
              ? currentSettings.startingTtTokenCount
              : DEFAULT_ENABLED_STARTING_TT_TOKEN_COUNT,
            ttModeEnabled: true,
          }
        : {
            ...currentSettings,
            ttModeEnabled: false,
          },
    );
  }

  return {
    closeRoomActionStatus,
    handleCloseRoom,
    handlePlayerStartingCardCountChange,
    handlePlayerStartingTtTokenCountChange,
    handlePlayerKick: kickPlayerAction.handlePlayerKick,
    handlePlayerProfileChange,
    handleRoomRename,
    handleRoomSettingsChange,
    handleStartGame,
    isCloseRoomPending,
    isKickPlayerPending: kickPlayerAction.isPending,
    isStartGamePending,
    kickPlayerActionState: kickPlayerAction.actionState,
    startGameActionStatus,
    toggleTtMode,
  };
}
