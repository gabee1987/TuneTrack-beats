import { Badge } from "../../../features/ui/Badge";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbyHostStartPanel } from "./LobbyHostStartPanel";
import { RulesGameSection } from "./rules/RulesGameSection";
import { RulesTokensSection } from "./rules/RulesTokensSection";
import { LobbySpotifySection } from "./spotify/LobbySpotifySection";
import { LobbySectionHeader } from "./LobbySectionHeader";
import { LobbyRoomSettingsStatus } from "./LobbyRoomSettingsStatus";
import type { LobbyHostSettingsPanelProps } from "./LobbyHostSettings.types";
import styles from "../lobbySettings.module.css";

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
        <SurfaceCard className={styles.settingsGroup}>
          <RulesGameSection
            disabled={isRoomSettingsPending}
            numberInput="stepper"
            onChange={onRoomSettingsChange}
            settings={currentSettings}
          />
        </SurfaceCard>
        <SurfaceCard className={styles.settingsGroup}>
          <RulesTokensSection
            disabled={isRoomSettingsPending}
            numberInput="stepper"
            onChange={onRoomSettingsChange}
            onToggleTokens={onToggleTtMode}
            settings={currentSettings}
          />
        </SurfaceCard>
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
