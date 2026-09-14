import type { PublicRoomSettings } from "@tunetrack/shared";
import type { StartGameActionStatus } from "../LobbyPage.types";

export type LobbyRoomSettingsChangeHandler = (nextSettings: PublicRoomSettings) => void;

export interface LobbyHostSettingsPanelProps {
  currentSettings: PublicRoomSettings;
  isStartGamePending: boolean;
  onIntentToStartGame: () => void;
  onRoomSettingsChange: LobbyRoomSettingsChangeHandler;
  onStartGame: () => void;
  onToggleTtMode: (enabled: boolean) => void;
  startGameActionStatus: StartGameActionStatus;
}
