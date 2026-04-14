import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { AdaptiveSelect } from "./AdaptiveSelect";
import { LobbyRangeSettingField } from "./LobbyRangeSettingField";
import { LobbySelectSettingField } from "./LobbySelectSettingField";
import type { LobbyRoomSettingsChangeHandler } from "./LobbyHostSettings.types";
import { LobbySectionHeader } from "./LobbySectionHeader";
import { LobbyToggleField } from "./LobbyToggleField";
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
  return (
    <SurfaceCard className={styles.settingsGroup}>
      <LobbySectionHeader
        description="Tokens for skips, buys, and challenges."
        title="TT mode"
        titleAs="h3"
        variant="compact"
      />

      <LobbyToggleField
        checked={currentSettings.ttModeEnabled}
        hint="Shows TT settings and defaults starting TT to 1."
        label="Enable TT mode"
        onChange={onToggleTtMode}
      />

      {currentSettings.ttModeEnabled ? (
        <div className={styles.conditionalGroup}>
          <LobbyRangeSettingField
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

          <LobbySelectSettingField
            label="Challenge window"
            value={
              currentSettings.challengeWindowDurationSeconds === null
                ? "Manual"
                : `${currentSettings.challengeWindowDurationSeconds}s`
            }
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
                  value: "manual",
                },
                {
                  label: `${DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS} seconds`,
                  value: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS.toString(),
                },
                {
                  label: `${MIN_CHALLENGE_WINDOW_DURATION_SECONDS} seconds`,
                  value: MIN_CHALLENGE_WINDOW_DURATION_SECONDS.toString(),
                },
                {
                  label: `${MAX_CHALLENGE_WINDOW_DURATION_SECONDS} seconds`,
                  value: MAX_CHALLENGE_WINDOW_DURATION_SECONDS.toString(),
                },
              ]}
              value={
                currentSettings.challengeWindowDurationSeconds === null
                  ? "manual"
                  : currentSettings.challengeWindowDurationSeconds.toString()
              }
            />
          </LobbySelectSettingField>
        </div>
      ) : (
        <p className={styles.settingsInlineHint}>
          Turn this on to show TT options.
        </p>
      )}
    </SurfaceCard>
  );
}
