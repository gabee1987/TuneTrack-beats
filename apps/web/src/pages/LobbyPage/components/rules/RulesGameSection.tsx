import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
  type RevealConfirmMode,
} from "@tunetrack/shared/client";
import { useId } from "react";
import { useI18n } from "../../../../features/i18n";
import { SegmentedControl, SettingRow } from "../../../../features/ui/primitives";
import { RulesNumberSetting, type RulesNumberInput } from "./RulesNumberSetting";
import styles from "./rules.module.css";

interface RulesGameSectionProps {
  disabled: boolean;
  numberInput: RulesNumberInput;
  onChange: (nextSettings: PublicRoomSettings) => void;
  settings: PublicRoomSettings;
}

/** Songs to win, songs to start with and who taps Next (`22` §4.7, Game). */
export function RulesGameSection({
  disabled,
  numberInput,
  onChange,
  settings,
}: RulesGameSectionProps) {
  const { t } = useI18n();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <h3 className={styles.sectionTitle} id={titleId}>
        {t("lobby.rules.game")}
      </h3>
      <div className={styles.rows}>
        <RulesNumberSetting
          description={t("lobby.rules.targetBody")}
          disabled={disabled}
          max={MAX_TARGET_TIMELINE_CARD_COUNT}
          min={MIN_TARGET_TIMELINE_CARD_COUNT}
          numberInput={numberInput}
          onChange={(targetTimelineCardCount) => onChange({ ...settings, targetTimelineCardCount })}
          title={t("lobby.rules.target")}
          value={settings.targetTimelineCardCount}
        />
        <RulesNumberSetting
          description={t("lobby.rules.startingBody")}
          disabled={disabled}
          max={MAX_STARTING_TIMELINE_CARD_COUNT}
          min={MIN_STARTING_TIMELINE_CARD_COUNT}
          numberInput={numberInput}
          onChange={(defaultStartingTimelineCardCount) =>
            onChange({ ...settings, defaultStartingTimelineCardCount })
          }
          title={t("lobby.rules.starting")}
          value={settings.defaultStartingTimelineCardCount}
        />
        <SettingRow
          description={t("lobby.rules.whoTapsNextBody")}
          isStacked
          title={t("lobby.rules.whoTapsNext")}
        >
          <SegmentedControl<RevealConfirmMode>
            aria-label={t("lobby.rules.whoTapsNext")}
            className={styles.segmented}
            onChange={(revealConfirmMode) => onChange({ ...settings, revealConfirmMode })}
            options={[
              { disabled, label: t("lobby.rules.whoTapsNextHost"), value: "host_only" },
              {
                disabled,
                label: t("lobby.rules.whoTapsNextHostOrPlayer"),
                value: "host_or_active_player",
              },
            ]}
            value={settings.revealConfirmMode}
          />
        </SettingRow>
      </div>
    </section>
  );
}
