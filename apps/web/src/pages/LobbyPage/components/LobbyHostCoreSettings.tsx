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
import { useI18n } from "../../../features/i18n";
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
  const { t } = useI18n();

  return (
    <SurfaceCard className={styles.settingsGroup}>
      <LobbySectionHeader
        description={t("lobby.host.coreDescription")}
        title={t("lobby.host.coreTitle")}
        titleAs="h3"
        variant="compact"
      />

      <RangeField
        info={t("lobby.host.cardsNeededInfo")}
        label={t("lobby.host.cardsNeeded")}
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
        info={t("lobby.host.defaultStartingCardsInfo")}
        label={t("lobby.host.defaultStartingCards")}
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
        info={t("lobby.host.revealConfirmationInfo")}
        label={t("lobby.host.revealConfirmation")}
      >
        <AdaptiveSelect
          label={t("lobby.host.revealConfirmation")}
          onChange={(nextValue) =>
            onRoomSettingsChange({
              ...currentSettings,
              revealConfirmMode: nextValue as RevealConfirmMode,
            })
          }
          options={[
            {
              label: t("lobby.host.revealHostOnly"),
              value: "host_only",
            },
            {
              label: t("lobby.host.revealHostOrActivePlayer"),
              value: "host_or_active_player",
            },
          ]}
          value={currentSettings.revealConfirmMode}
        />
      </SettingField>
    </SurfaceCard>
  );
}
