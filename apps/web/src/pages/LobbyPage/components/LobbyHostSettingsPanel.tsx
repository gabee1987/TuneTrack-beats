import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PublicRoomSettings,
  type RevealConfirmMode,
} from "@tunetrack/shared";
import { AdaptiveSelect } from "./AdaptiveSelect";
import styles from "../LobbyPage.module.css";

interface LobbyHostSettingsPanelProps {
  currentSettings: PublicRoomSettings;
  onRoomSettingsChange: (nextSettings: PublicRoomSettings) => void;
  onStartGame: () => void;
  onToggleTtMode: (enabled: boolean) => void;
}

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
        <section className={styles.settingsGroup}>
          <div className={styles.settingsGroupHeader}>
            <h3 className={styles.settingsGroupTitle}>Core rules</h3>
            <p className={styles.settingsGroupDescription}>Win target and starting hand.</p>
          </div>

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
        </section>

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
      </div>

      <div className={styles.primaryActionBar}>
        <div>
          <h3 className={styles.primaryActionTitle}>Ready to play</h3>
          <p className={styles.primaryActionDescription}>Start when the room looks right.</p>
        </div>
        <button className={styles.startGameButton} onClick={onStartGame} type="button">
          Start Game
        </button>
      </div>
    </section>
  );
}
