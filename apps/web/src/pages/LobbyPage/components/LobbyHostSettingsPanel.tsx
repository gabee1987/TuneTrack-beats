import { Badge } from "../../../features/ui/Badge";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbyHostCoreSettings } from "./LobbyHostCoreSettings";
import { LobbyHostStartPanel } from "./LobbyHostStartPanel";
import { LobbyHostTtSettings } from "./LobbyHostTtSettings";
import { LobbySpotifySection } from "./LobbySpotifySection";
import { LobbySectionHeader } from "./LobbySectionHeader";
import type { LobbyHostSettingsPanelProps } from "./LobbyHostSettings.types";
import styles from "../LobbyPage.module.css";

export function LobbyHostSettingsPanel({
  currentSettings,
  onIntentToStartGame,
  onRoomSettingsChange,
  onStartGame,
  onToggleTtMode,
}: LobbyHostSettingsPanelProps) {
  const { t } = useI18n();

  return (
    <SurfaceCard className={styles.settingsPanel}>
      <LobbySectionHeader
        badge={<Badge>{t("lobby.host.badge")}</Badge>}
        description={t("lobby.host.description")}
        title={t("lobby.host.title")}
      />

      <div className={styles.settingsGrid}>
        <LobbyHostCoreSettings
          currentSettings={currentSettings}
          onRoomSettingsChange={onRoomSettingsChange}
        />
        <LobbyHostTtSettings
          currentSettings={currentSettings}
          onRoomSettingsChange={onRoomSettingsChange}
          onToggleTtMode={onToggleTtMode}
        />
        <LobbySpotifySection currentSettings={currentSettings} />
      </div>

      <LobbyHostStartPanel onIntentToStart={onIntentToStartGame} onStartGame={onStartGame} />
    </SurfaceCard>
  );
}
