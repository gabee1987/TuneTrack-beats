import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
  type RevealConfirmMode,
} from "@tunetrack/shared";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { AdaptiveSelect } from "./AdaptiveSelect";
import type { LobbyRoomSettingsChangeHandler } from "./LobbyHostSettings.types";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

interface LobbyHostCoreSettingsProps {
  currentSettings: PublicRoomSettings;
  onRoomSettingsChange: LobbyRoomSettingsChangeHandler;
}

export function LobbyHostCoreSettings({
  currentSettings,
  onRoomSettingsChange,
}: LobbyHostCoreSettingsProps) {
  return (
    <SurfaceCard className={styles.settingsGroup}>
      <LobbySectionHeader
        description="Win target and starting hand."
        title="Core rules"
        titleAs="h3"
        variant="compact"
      />

      <label className={styles.settingField}>
        <div className={styles.settingLabelRow}>
          <span>Cards needed to win</span>
          <strong className={styles.settingValue}>
            {currentSettings.targetTimelineCardCount}
          </strong>
        </div>
        <input
          className={styles.rangeInput}
          max={MAX_TARGET_TIMELINE_CARD_COUNT}
          min={MIN_TARGET_TIMELINE_CARD_COUNT}
          onChange={(event) =>
            onRoomSettingsChange({
              ...currentSettings,
              targetTimelineCardCount: Number(event.target.value),
            })
          }
          type="range"
          value={currentSettings.targetTimelineCardCount}
        />
      </label>

      <label className={styles.settingField}>
        <div className={styles.settingLabelRow}>
          <span>Default starting cards</span>
          <strong className={styles.settingValue}>
            {currentSettings.defaultStartingTimelineCardCount}
          </strong>
        </div>
        <input
          className={styles.rangeInput}
          max={MAX_STARTING_TIMELINE_CARD_COUNT}
          min={MIN_STARTING_TIMELINE_CARD_COUNT}
          onChange={(event) =>
            onRoomSettingsChange({
              ...currentSettings,
              defaultStartingTimelineCardCount: Number(event.target.value),
            })
          }
          type="range"
          value={currentSettings.defaultStartingTimelineCardCount}
        />
      </label>

      <label className={styles.settingField}>
        <div className={styles.settingLabelRow}>
          <span>Reveal confirmation</span>
        </div>
        <AdaptiveSelect
          label="Reveal confirmation"
          onChange={(nextValue) =>
            onRoomSettingsChange({
              ...currentSettings,
              revealConfirmMode: nextValue as RevealConfirmMode,
            })
          }
          options={[
            {
              label: "Host only",
              value: "host_only",
            },
            {
              label: "Host or active player",
              value: "host_or_active_player",
            },
          ]}
          value={currentSettings.revealConfirmMode}
        />
      </label>
    </SurfaceCard>
  );
}
