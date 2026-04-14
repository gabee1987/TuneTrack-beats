import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { RangeField } from "../../../features/ui/RangeField";
import { SettingField } from "../../../features/ui/SettingField";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { ToggleField } from "../../../features/ui/ToggleField";
import { AdaptiveSelect } from "./AdaptiveSelect";
import type { LobbyRoomSettingsChangeHandler } from "./LobbyHostSettings.types";
import { LobbySectionHeader } from "./LobbySectionHeader";
import {
  formatChallengeWindowSettingValue,
  getChallengeWindowOptionValueMap,
  getChallengeWindowSelectValue,
} from "../lobbySettingsSelectors";
import styles from "../LobbyPage.module.css";

interface LobbyHostTtSettingsProps {
  currentSettings: PublicRoomSettings;
  onRoomSettingsChange: LobbyRoomSettingsChangeHandler;
  onToggleTtMode: (enabled: boolean) => void;
}

export function LobbyHostTtSettings({
  currentSettings,
  onRoomSettingsChange,
  onToggleTtMode,
}: LobbyHostTtSettingsProps) {
  const challengeWindowOptionValues = getChallengeWindowOptionValueMap();

  return (
    <SurfaceCard className={styles.settingsGroup}>
      <LobbySectionHeader
        description="Tokens for skips, buys, and challenges."
        title="TT mode"
        titleAs="h3"
        variant="compact"
      />

      <ToggleField
        checked={currentSettings.ttModeEnabled}
        hint="Shows TT settings and defaults starting TT to 1."
        label="Enable TT mode"
        onChange={onToggleTtMode}
      />

      {currentSettings.ttModeEnabled ? (
        <div className={styles.conditionalGroup}>
          <RangeField
            label="Starting TT for every player"
            max={MAX_STARTING_TT_TOKEN_COUNT}
            min={MIN_STARTING_TT_TOKEN_COUNT}
            onChange={(startingTtTokenCount) =>
              onRoomSettingsChange({
                ...currentSettings,
                startingTtTokenCount,
              })
            }
            value={currentSettings.startingTtTokenCount}
          />

          <SettingField
            label="Challenge window"
            value={formatChallengeWindowSettingValue(
              currentSettings.challengeWindowDurationSeconds,
            )}
          >
            <AdaptiveSelect
              label="Challenge window"
              onChange={(nextValue) =>
                onRoomSettingsChange({
                  ...currentSettings,
                  challengeWindowDurationSeconds:
                    nextValue === "manual" ? null : Number(nextValue),
                })
              }
              options={[
                {
                  label: "Host manual",
                  value: challengeWindowOptionValues.manual,
                },
                {
                  label: `${DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS} seconds`,
                  value: challengeWindowOptionValues.defaultDuration,
                },
                {
                  label: `${MIN_CHALLENGE_WINDOW_DURATION_SECONDS} seconds`,
                  value: challengeWindowOptionValues.minDuration,
                },
                {
                  label: `${MAX_CHALLENGE_WINDOW_DURATION_SECONDS} seconds`,
                  value: challengeWindowOptionValues.maxDuration,
                },
              ]}
              value={getChallengeWindowSelectValue(
                currentSettings.challengeWindowDurationSeconds,
              )}
            />
          </SettingField>
        </div>
      ) : (
        <p className={styles.settingsInlineHint}>
          Turn this on to show TT options.
        </p>
      )}
    </SurfaceCard>
  );
}
