import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { AdaptiveSelect } from "./AdaptiveSelect";
import type { LobbyRoomSettingsChangeHandler } from "./LobbyHostSettings.types";
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
    <section className={styles.settingsGroup}>
      <div className={styles.settingsGroupHeader}>
        <h3 className={styles.settingsGroupTitle}>TT mode</h3>
        <p className={styles.settingsGroupDescription}>
          Tokens for skips, buys, and challenges.
        </p>
      </div>

      <label className={styles.toggleField}>
        <div className={styles.toggleCopy}>
          <span className={styles.toggleLabel}>Enable TT mode</span>
          <span className={styles.toggleHint}>
            Shows TT settings and defaults starting TT to 1.
          </span>
        </div>
        <input
          checked={currentSettings.ttModeEnabled}
          className={styles.checkbox}
          onChange={(event) => onToggleTtMode(event.target.checked)}
          type="checkbox"
        />
      </label>

      {currentSettings.ttModeEnabled ? (
        <div className={styles.conditionalGroup}>
          <label className={styles.settingField}>
            <div className={styles.settingLabelRow}>
              <span>Starting TT for every player</span>
              <strong className={styles.settingValue}>
                {currentSettings.startingTtTokenCount}
              </strong>
            </div>
            <input
              className={styles.rangeInput}
              max={MAX_STARTING_TT_TOKEN_COUNT}
              min={MIN_STARTING_TT_TOKEN_COUNT}
              onChange={(event) =>
                onRoomSettingsChange({
                  ...currentSettings,
                  startingTtTokenCount: Number(event.target.value),
                })
              }
              type="range"
              value={currentSettings.startingTtTokenCount}
            />
          </label>

          <label className={styles.settingField}>
            <div className={styles.settingLabelRow}>
              <span>Challenge window</span>
              <strong className={styles.settingValue}>
                {currentSettings.challengeWindowDurationSeconds === null
                  ? "Manual"
                  : `${currentSettings.challengeWindowDurationSeconds}s`}
              </strong>
            </div>
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
          </label>
        </div>
      ) : (
        <p className={styles.settingsInlineHint}>
          Turn this on to show TT options.
        </p>
      )}
    </section>
  );
}
