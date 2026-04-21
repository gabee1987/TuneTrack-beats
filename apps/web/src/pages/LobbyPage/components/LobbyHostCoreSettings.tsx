import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
  type RevealConfirmMode,
} from "@tunetrack/shared";
import { RangeField } from "../../../features/ui/RangeField";
import { SettingField } from "../../../features/ui/SettingField";
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

      <RangeField
        info="The first player to reach this many timeline cards wins the game."
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

      <RangeField
        info="New players start with this many cards unless you override them individually."
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

      <SettingField
        info="Choose who can confirm the correct year after a song is placed."
        label="Reveal confirmation"
      >
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
      </SettingField>
    </SurfaceCard>
  );
}
