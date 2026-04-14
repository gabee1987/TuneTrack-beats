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
import { LobbyRangeSettingField } from "./LobbyRangeSettingField";
import { LobbySelectSettingField } from "./LobbySelectSettingField";
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

      <LobbyRangeSettingField
        label="Cards needed to win"
        max={MAX_TARGET_TIMELINE_CARD_COUNT}
        min={MIN_TARGET_TIMELINE_CARD_COUNT}
        onChange={(targetTimelineCardCount) =>
          onRoomSettingsChange({
            ...currentSettings,
            targetTimelineCardCount,
          })
        }
        value={currentSettings.targetTimelineCardCount}
      />

      <LobbyRangeSettingField
        label="Default starting cards"
        max={MAX_STARTING_TIMELINE_CARD_COUNT}
        min={MIN_STARTING_TIMELINE_CARD_COUNT}
        onChange={(defaultStartingTimelineCardCount) =>
          onRoomSettingsChange({
            ...currentSettings,
            defaultStartingTimelineCardCount,
          })
        }
        value={currentSettings.defaultStartingTimelineCardCount}
      />

      <LobbySelectSettingField label="Reveal confirmation">
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
      </LobbySelectSettingField>
    </SurfaceCard>
  );
}
