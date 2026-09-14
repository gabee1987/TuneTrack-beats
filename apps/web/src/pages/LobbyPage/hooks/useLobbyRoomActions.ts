import {
  ClientToServerEvent,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import { getSocketClient } from "../../../services/socket/socketClient";
import type { StartGameActionStatus } from "../LobbyPage.types";

const DEFAULT_ENABLED_STARTING_TT_TOKEN_COUNT = 1;

interface UseLobbyRoomActionsOptions {
  currentSettings: PublicRoomSettings;
  isHost: boolean;
  roomState: PublicRoomState | null;
}

interface UseLobbyRoomActionsResult {
  handleCloseRoom: () => void;
  handlePlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
  handlePlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
  handlePlayerProfileChange: (displayName: string) => void;
  handlePlayerKick: (player: PublicPlayerState) => void;
  handleRoomRename: (nextRoomId: string) => void;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  isStartGamePending: boolean;
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
  const isStartGamePendingRef = useRef(false);
  const [startGameActionStatus, setStartGameActionStatus] =
    useState<StartGameActionStatus>("idle");
  const isStartGamePending =
    startGameActionStatus === "pending" || startGameActionStatus === "retrying";

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

  function handlePlayerKick(player: PublicPlayerState) {
    if (!roomState || !isHost || player.id === roomState.hostId) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.KickPlayer, {
      playerId: player.id,
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

  function handleCloseRoom() {
    if (!roomState || !isHost) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
    });
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
    handleCloseRoom,
    handlePlayerStartingCardCountChange,
    handlePlayerStartingTtTokenCountChange,
    handlePlayerKick,
    handlePlayerProfileChange,
    handleRoomRename,
    handleRoomSettingsChange,
    handleStartGame,
    isStartGamePending,
    startGameActionStatus,
    toggleTtMode,
  };
}
