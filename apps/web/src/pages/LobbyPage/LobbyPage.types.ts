import type { PublicPlayerState, PublicRoomSettings, PublicRoomState } from "@tunetrack/shared";
import type { LobbyAssemblyModel } from "./hooks/buildLobbyAssemblyModel";

export type StartGameActionStatus = "idle" | "pending" | "retrying" | "failed";
export type CloseRoomActionStatus = "idle" | "pending" | "retrying" | "failed";
export type LobbyKickPlayerActionStatus = "pending" | "retrying" | "failed";
export type LobbyPlayerSettingsActionStatus = "pending" | "retrying" | "failed";
export type RoomSettingsActionStatus = "idle" | "pending" | "retrying" | "failed";
export type LobbyIdentityActionStatus = "pending" | "retrying" | "failed";

export interface LobbyIdentityActionState {
  kind: "profile" | "rename";
  status: LobbyIdentityActionStatus;
}

export interface LobbyKickPlayerActionState {
  playerId: string;
  status: LobbyKickPlayerActionStatus;
}

export interface LobbyPlayerSettingsActionState {
  playerId: string;
  status: LobbyPlayerSettingsActionStatus;
}

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
  handlePlayerProfileChange: (displayName: string) => Promise<boolean>;
  handleRoomRename: (nextRoomId: string) => Promise<boolean>;
  handleRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  handleStartGame: () => void;
  isHost: boolean;
  isCloseRoomPending: boolean;
  isKickPlayerPending: boolean;
  isIdentityActionPending: boolean;
  isPlayerSettingsPending: boolean;
  isRoomSettingsPending: boolean;
  isStartGamePending: boolean;
  kickPlayerActionState: LobbyKickPlayerActionState | null;
  identityActionState: LobbyIdentityActionState | null;
  playerSettingsActionState: LobbyPlayerSettingsActionState | null;
  roomSettingsActionStatus: RoomSettingsActionStatus;
  preloadGame: () => void;
  roomId: string | undefined;
  roomState: PublicRoomState | null;
  startGameActionStatus: StartGameActionStatus;
  toggleTtMode: (enabled: boolean) => void;
}

export interface LobbyPageAssemblyProps {
  model: LobbyAssemblyModel;
}
