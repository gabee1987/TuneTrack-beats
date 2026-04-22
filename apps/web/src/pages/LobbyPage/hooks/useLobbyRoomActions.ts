import {
  ClientToServerEvent,
  type PublicPlayerState,
  type PublicRoomSettings,
  type PublicRoomState,
} from "@tunetrack/shared";
import { getSocketClient } from "../../../services/socket/socketClient";

const DEFAULT_ENABLED_STARTING_TT_TOKEN_COUNT = 1;

interface UseLobbyRoomActionsOptions {
  currentSettings: PublicRoomSettings;
  isHost: boolean;
  roomState: PublicRoomState | null;
}

interface UseLobbyRoomActionsResult {
  handleCloseRoom: () => void;
  handlePlayerStartingCardCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
  handlePlayerStartingTtTokenCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
  handlePlayerProfileChange: (displayName: string) => void;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  toggleTtMode: (enabled: boolean) => void;
}

export function useLobbyRoomActions({
  currentSettings,
  isHost,
  roomState,
}: UseLobbyRoomActionsOptions): UseLobbyRoomActionsResult {
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

  function handlePlayerStartingCardCountChange(
    player: PublicPlayerState,
    nextValue: number,
  ) {
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

  function handlePlayerStartingTtTokenCountChange(
    player: PublicPlayerState,
    nextValue: number,
  ) {
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

  function handleStartGame() {
    if (!roomState || !isHost) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.StartGame, {
      roomId: roomState.roomId,
    });
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
    handlePlayerProfileChange,
    handleRoomSettingsChange,
    handleStartGame,
    toggleTtMode,
  };
}
