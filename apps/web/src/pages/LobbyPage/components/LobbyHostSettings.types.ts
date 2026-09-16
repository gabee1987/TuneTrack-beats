import type { PublicRoomSettings } from "@tunetrack/shared";
import type { RoomSettingsActionStatus, StartGameActionStatus } from "../LobbyPage.types";

export type LobbyRoomSettingsChangeHandler = (nextSettings: PublicRoomSettings) => void;

export interface LobbyHostSettingsPanelProps {
  currentSettings: PublicRoomSettings;
  isRoomSettingsPending: boolean;
  isStartGamePending: boolean;
  onIntentToStartGame: () => void;
  onRoomSettingsChange: LobbyRoomSettingsChangeHandler;
  onStartGame: () => void;
  onToggleTtMode: (enabled: boolean) => void;
  roomSettingsActionStatus: RoomSettingsActionStatus;
  startGameActionStatus: StartGameActionStatus;
}
