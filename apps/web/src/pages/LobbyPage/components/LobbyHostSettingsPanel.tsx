import { LobbyHostCoreSettings } from "./LobbyHostCoreSettings";
import { LobbyHostStartPanel } from "./LobbyHostStartPanel";
import { LobbyHostTtSettings } from "./LobbyHostTtSettings";
import type { LobbyHostSettingsPanelProps } from "./LobbyHostSettings.types";
import styles from "../LobbyPage.module.css";

export function LobbyHostSettingsPanel({
  currentSettings,
  onRoomSettingsChange,
  onStartGame,
  onToggleTtMode,
}: LobbyHostSettingsPanelProps) {
  return (
    <section className={styles.settingsPanel}>
      <div className={styles.sectionHeading}>
        <div>
          <h2 className={styles.sectionTitle}>Host setup</h2>
          <p className={styles.sectionDescription}>Set the rules, then start.</p>
        </div>
        <span className={styles.summaryChip}>Host only</span>
      </div>

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
      </div>

      <LobbyHostStartPanel onStartGame={onStartGame} />
    </section>
  );
}
