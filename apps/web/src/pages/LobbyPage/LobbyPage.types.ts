import type { PublicPlayerState, PublicRoomSettings, PublicRoomState } from "@tunetrack/shared";
import type { LobbyAssemblyModel } from "./hooks/buildLobbyAssemblyModel";

export type StartGameActionStatus = "idle" | "pending" | "retrying" | "failed";
export type CloseRoomActionStatus = "idle" | "pending" | "retrying" | "failed";

export interface LobbyPageController {
  closeRoomActionStatus: CloseRoomActionStatus;
  connectionStatus: string;
  currentPlayerId: string | null;
  currentSettings: PublicRoomSettings;
  displayName: string;
  errorCode: string | null;
  errorMessage: string | null;
  handleClosedRoomReset: () => void;
  handleCloseRoom: () => void;
  hasClosedRoomReset: boolean;
  handlePlayerKick: (player: PublicPlayerState) => void;
  handlePlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
  handlePlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
  handlePlayerProfileChange: (displayName: string) => void;
  handleRoomRename: (nextRoomId: string) => void;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  isHost: boolean;
  isCloseRoomPending: boolean;
  isStartGamePending: boolean;
  preloadGame: () => void;
  roomId: string | undefined;
  roomState: PublicRoomState | null;
  startGameActionStatus: StartGameActionStatus;
  toggleTtMode: (enabled: boolean) => void;
}

export interface LobbyPageAssemblyProps {
  model: LobbyAssemblyModel;
}
