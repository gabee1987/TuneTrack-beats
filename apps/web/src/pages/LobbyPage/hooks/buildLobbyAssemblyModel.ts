import type { PublicPlayerState, PublicRoomSettings } from "@tunetrack/shared";
import type { LobbyPageController } from "../LobbyPage.types";

export interface LobbyAssemblyModel {
  shell: {
    errorMessage: string | null;
  };
  room: {
    connectionStatus: string;
    currentPlayerId: string | null;
    displayName: string;
    hasStartedJoinError: boolean;
    isHost: boolean;
    players: PublicPlayerState[];
    resolvedRoomId: string;
  };
  hostSettings: {
    currentSettings: PublicRoomSettings;
    onIntentToStartGame: () => void;
    onRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
    onStartGame: () => void;
    onToggleTtMode: (enabled: boolean) => void;
  };
  players: {
    currentPlayerId: string | null;
    isHost: boolean;
    onPlayerKick: (player: PublicPlayerState) => void;
    onPlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
    onPlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
    players: PublicPlayerState[];
    roomSettings: PublicRoomSettings;
  };
  roomActions: {
    isHost: boolean;
    onCloseRoom: () => void;
    onIntentToStartGame: () => void;
    onStartGame: () => void;
  };
  identity: {
    displayName: string;
    hasStartedJoinError: boolean;
    isHost: boolean;
    onPlayerProfileChange: (displayName: string) => void;
    onRoomRename: (nextRoomId: string) => void;
    onStartGame: () => void;
    preloadGame: () => void;
    resolvedRoomId: string;
  };
}

export function buildLobbyAssemblyModel(controller: LobbyPageController): LobbyAssemblyModel {
  const resolvedRoomId = controller.roomState?.roomId ?? controller.roomId ?? "lobby";
  const players = controller.roomState?.players ?? [];
  const hasStartedJoinError = controller.errorCode === "GAME_ALREADY_STARTED";

  return {
    shell: {
      errorMessage: controller.errorMessage,
    },
    room: {
      connectionStatus: controller.connectionStatus,
      currentPlayerId: controller.currentPlayerId,
      displayName: controller.displayName,
      hasStartedJoinError,
      isHost: controller.isHost,
      players,
      resolvedRoomId,
    },
    hostSettings: {
      currentSettings: controller.currentSettings,
      onIntentToStartGame: controller.preloadGame,
      onRoomSettingsChange: controller.handleRoomSettingsChange,
      onStartGame: controller.handleStartGame,
      onToggleTtMode: controller.toggleTtMode,
    },
    players: {
      currentPlayerId: controller.currentPlayerId,
      isHost: controller.isHost,
      onPlayerKick: controller.handlePlayerKick,
      onPlayerStartingCardCountChange: controller.handlePlayerStartingCardCountChange,
      onPlayerStartingTtTokenCountChange: controller.handlePlayerStartingTtTokenCountChange,
      players,
      roomSettings: controller.currentSettings,
    },
    roomActions: {
      isHost: controller.isHost,
      onCloseRoom: controller.handleCloseRoom,
      onIntentToStartGame: controller.preloadGame,
      onStartGame: controller.handleStartGame,
    },
    identity: {
      displayName: controller.displayName,
      hasStartedJoinError,
      isHost: controller.isHost,
      onPlayerProfileChange: controller.handlePlayerProfileChange,
      onRoomRename: controller.handleRoomRename,
      onStartGame: controller.handleStartGame,
      preloadGame: controller.preloadGame,
      resolvedRoomId,
    },
  };
}
