import type { PublicRoomSettings } from "@tunetrack/shared";

export type LobbyRoomSettingsChangeHandler = (
  nextSettings: PublicRoomSettings,
) => void;

export interface LobbyHostSettingsPanelProps {
  currentSettings: PublicRoomSettings;
  onRoomSettingsChange: LobbyRoomSettingsChangeHandler;
  onStartGame: () => void;
  onToggleTtMode: (enabled: boolean) => void;
}
