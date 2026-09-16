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
    isStartGamePending: boolean;
    onIntentToStartGame: () => void;
    onRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
    onStartGame: () => void;
    onToggleTtMode: (enabled: boolean) => void;
    startGameActionStatus: LobbyPageController["startGameActionStatus"];
  };
  players: {
    currentPlayerId: string | null;
    isHost: boolean;
    isKickPlayerPending: boolean;
    kickPlayerActionState: LobbyPageController["kickPlayerActionState"];
    onPlayerKick: (player: PublicPlayerState) => void;
    onPlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
    onPlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
    players: PublicPlayerState[];
    roomSettings: PublicRoomSettings;
  };
  roomActions: {
    closeRoomActionStatus: LobbyPageController["closeRoomActionStatus"];
    isHost: boolean;
    isCloseRoomPending: boolean;
    isStartGamePending: boolean;
    onCloseRoom: () => void;
    onIntentToStartGame: () => void;
    onStartGame: () => void;
    startGameActionStatus: LobbyPageController["startGameActionStatus"];
  };
  identity: {
    displayName: string;
    hasStartedJoinError: boolean;
    isHost: boolean;
    isStartGamePending: boolean;
    onPlayerProfileChange: (displayName: string) => void;
    onRoomRename: (nextRoomId: string) => void;
    onStartGame: () => void;
    preloadGame: () => void;
    resolvedRoomId: string;
    startGameActionStatus: LobbyPageController["startGameActionStatus"];
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
      isStartGamePending: controller.isStartGamePending,
      onIntentToStartGame: controller.preloadGame,
      onRoomSettingsChange: controller.handleRoomSettingsChange,
      onStartGame: controller.handleStartGame,
      onToggleTtMode: controller.toggleTtMode,
      startGameActionStatus: controller.startGameActionStatus,
    },
    players: {
      currentPlayerId: controller.currentPlayerId,
      isHost: controller.isHost,
      isKickPlayerPending: controller.isKickPlayerPending,
      kickPlayerActionState: controller.kickPlayerActionState,
      onPlayerKick: controller.handlePlayerKick,
      onPlayerStartingCardCountChange: controller.handlePlayerStartingCardCountChange,
      onPlayerStartingTtTokenCountChange: controller.handlePlayerStartingTtTokenCountChange,
      players,
      roomSettings: controller.currentSettings,
    },
    roomActions: {
      closeRoomActionStatus: controller.closeRoomActionStatus,
      isHost: controller.isHost,
      isCloseRoomPending: controller.isCloseRoomPending,
      isStartGamePending: controller.isStartGamePending,
      onCloseRoom: controller.handleCloseRoom,
      onIntentToStartGame: controller.preloadGame,
      onStartGame: controller.handleStartGame,
      startGameActionStatus: controller.startGameActionStatus,
    },
    identity: {
      displayName: controller.displayName,
      hasStartedJoinError,
      isHost: controller.isHost,
      isStartGamePending: controller.isStartGamePending,
      onPlayerProfileChange: controller.handlePlayerProfileChange,
      onRoomRename: controller.handleRoomRename,
      onStartGame: controller.handleStartGame,
      preloadGame: controller.preloadGame,
      resolvedRoomId,
      startGameActionStatus: controller.startGameActionStatus,
    },
  };
}
