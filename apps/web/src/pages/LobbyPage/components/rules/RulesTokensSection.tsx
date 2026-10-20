import {
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { MeasuredDisclosure } from "../../../../features/motion";
import { SegmentedControl, SettingRow } from "../../../../features/ui/primitives";
import { ToggleSwitch } from "../../../../features/ui/ToggleSwitch";
import {
  fromBeatWindowChoice,
  getBeatWindowChoices,
  toBeatWindowChoice,
} from "./beatWindowChoices";
import { RulesNumberSetting, type RulesNumberInput } from "./RulesNumberSetting";
import styles from "./rules.module.css";

interface RulesTokensSectionProps {
  disabled: boolean;
  numberInput: RulesNumberInput;
  onChange: (nextSettings: PublicRoomSettings) => void;
  onToggleTokens: (isEnabled: boolean) => void;
  settings: PublicRoomSettings;
}

/** The tokens switch; its two settings slide open under it when tokens are on (`22` §4.7). */
export function RulesTokensSection({
  disabled,
  numberInput,
  onChange,
  onToggleTokens,
  settings,
}: RulesTokensSectionProps) {
  const { t } = useI18n();
  const isOn = settings.ttModeEnabled;

  return (
    <div className={styles.section}>
      <SettingRow description={t("lobby.rules.tokensBody")} title={t("lobby.rules.tokens")}>
        <ToggleSwitch
          ariaLabel={t("lobby.rules.tokens")}
          checked={isOn}
          disabled={disabled}
          onChange={onToggleTokens}
        />
      </SettingRow>
      <MeasuredDisclosure className={styles.rows} isOpen={isOn}>
        <RulesNumberSetting
          description={t("lobby.rules.startingTokensBody")}
          disabled={disabled}
          max={MAX_STARTING_TT_TOKEN_COUNT}
          min={MIN_STARTING_TT_TOKEN_COUNT}
          numberInput={numberInput}
          onChange={(startingTtTokenCount) => onChange({ ...settings, startingTtTokenCount })}
          title={t("lobby.rules.startingTokens")}
          value={settings.startingTtTokenCount}
        />
        <SettingRow
          description={t("lobby.rules.beatWindowBody")}
          isStacked
          title={t("lobby.rules.beatWindow")}
        >
          <SegmentedControl
            aria-label={t("lobby.rules.beatWindow")}
            className={styles.segmented}
            onChange={(choice) =>
              onChange({
                ...settings,
                challengeWindowDurationSeconds: fromBeatWindowChoice(choice),
              })
            }
            options={getBeatWindowChoices(settings.challengeWindowDurationSeconds).map(
              (seconds) => ({
                disabled,
                label:
                  seconds === null
                    ? t("lobby.rules.beatWindowNoLimit")
                    : t("lobby.rules.beatWindowSeconds", { seconds }),
                value: toBeatWindowChoice(seconds),
              }),
            )}
            value={toBeatWindowChoice(settings.challengeWindowDurationSeconds)}
          />
        </SettingRow>
      </MeasuredDisclosure>
    </div>
  );
}
