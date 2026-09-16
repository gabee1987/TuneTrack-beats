import { Badge } from "../../../features/ui/Badge";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbyHostCoreSettings } from "./LobbyHostCoreSettings";
import { LobbyHostStartPanel } from "./LobbyHostStartPanel";
import { LobbyHostTtSettings } from "./LobbyHostTtSettings";
import { LobbySpotifySection } from "./spotify/LobbySpotifySection";
import { LobbySectionHeader } from "./LobbySectionHeader";
import { LobbyRoomSettingsStatus } from "./LobbyRoomSettingsStatus";
import type { LobbyHostSettingsPanelProps } from "./LobbyHostSettings.types";
import styles from "../lobbyPageStyles";

export function LobbyHostSettingsPanel({
  currentSettings,
  isRoomSettingsPending,
  isStartGamePending,
  onIntentToStartGame,
  onRoomSettingsChange,
  onStartGame,
  onToggleTtMode,
  roomSettingsActionStatus,
  startGameActionStatus,
}: LobbyHostSettingsPanelProps) {
  const { t } = useI18n();

  return (
    <SurfaceCard className={styles.settingsPanel}>
      <LobbySectionHeader
        badge={<Badge>{t("lobby.host.badge")}</Badge>}
        description={t("lobby.host.description")}
        title={t("lobby.host.title")}
      />
      <LobbyRoomSettingsStatus actionStatus={roomSettingsActionStatus} />

      <div className={styles.settingsGrid}>
        <LobbyHostCoreSettings
          currentSettings={currentSettings}
          disabled={isRoomSettingsPending}
          onRoomSettingsChange={onRoomSettingsChange}
        />
        <LobbyHostTtSettings
          currentSettings={currentSettings}
          disabled={isRoomSettingsPending}
          onRoomSettingsChange={onRoomSettingsChange}
          onToggleTtMode={onToggleTtMode}
        />
        <LobbySpotifySection currentSettings={currentSettings} />
      </div>

      <LobbyHostStartPanel
        isStartGamePending={isStartGamePending}
        onIntentToStart={onIntentToStartGame}
        onStartGame={onStartGame}
        startGameActionStatus={startGameActionStatus}
      />
    </SurfaceCard>
  );
}
