import type {
  PublicPlayerState,
  PublicRoomSettings,
  PublicRoomState,
} from "@tunetrack/shared";

export interface LobbyPageController {
  connectionStatus: string;
  currentPlayerId: string | null;
  currentSettings: PublicRoomSettings;
  displayName: string;
  errorMessage: string | null;
  handleCloseRoom: () => void;
  handlePlayerStartingCardCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  isHost: boolean;
  preloadGame: () => void;
  roomId: string | undefined;
  roomState: PublicRoomState | null;
  toggleTtMode: (enabled: boolean) => void;
}

export interface LobbyPageAssemblyProps {
  controller: LobbyPageController;
}
