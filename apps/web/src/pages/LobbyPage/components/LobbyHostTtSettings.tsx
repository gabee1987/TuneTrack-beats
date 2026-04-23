import {
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import {
  createMeasuredDisclosureMotion,
  createStandardTransition,
  createToggleHintFadeMotion,
} from "../../../features/motion";
import { RangeField } from "../../../features/ui/RangeField";
import { SettingField, SettingInfoButton } from "../../../features/ui/SettingField";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { TtTokenAmount, TtTokenIcon } from "../../../features/ui/TtToken";
import { AdaptiveSelect } from "./AdaptiveSelect";
import type { LobbyRoomSettingsChangeHandler } from "./LobbyHostSettings.types";
import { LobbySectionHeader } from "./LobbySectionHeader";
import {
  formatChallengeWindowSettingValue,
  getChallengeWindowOptionValueMap,
  getChallengeWindowSelectValue,
} from "../lobbySettingsSelectors";
import styles from "../LobbyPage.module.css";

const ttModeInfo: ReactNode = (
  <span className={styles.ttInfoStack}>
    <span>
      <strong>What is token mode?</strong>
      <span>
        TuneTrack tokens add a tactical layer to the game. You can earn and spend tokens throughout
        the game. Save them for hard songs, bold shortcuts, and well-timed challenges. Tokens will
        be refered to as <TtTokenIcon className={styles.inlineTtTokenIcon} /> in-game.
      </span>
    </span>
    <span>
      <strong>Earn tokens</strong>
      <span>
        Players earn <TtTokenIcon className={styles.inlineTtTokenIcon} /> by proving they know the
        track, such as naming the song or artist before the reveal.
      </span>
    </span>
    <span>
      <strong>Spend on your turn</strong>
      <span>
        Spend <TtTokenAmount amount={1} /> to skip the current song once per turn. Spend{" "}
        <TtTokenAmount amount={3} /> to claim the song immediately without needing to know the
        correct release year.
      </span>
    </span>
    <span>
      <strong>Challenge with Beat!</strong>
      <span>
        See a placement that feels wrong? Call Beat!. If you&apos;re right, you steal that card into
        your own timeline. If you miss, you lose <TtTokenAmount amount={1} />.
      </span>
    </span>
    <span>
      <strong>Beat! timing</strong>
      <span>
        Beat! must be called before the challenge window closes. After a valid call, the clock stops
        and the challenge is resolved.
      </span>
    </span>
  </span>
);

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
  const reduceMotion = useReducedMotion() ?? false;
  const challengeWindowOptionValues = getChallengeWindowOptionValueMap();
  const ttSettingsContentRef = useRef<HTMLDivElement | null>(null);
  const [ttSettingsContentHeight, setTtSettingsContentHeight] = useState(0);

  useLayoutEffect(() => {
    const contentElement = ttSettingsContentRef.current;
    if (!contentElement) {
      return;
    }

    const updateMeasuredHeight = () => {
      setTtSettingsContentHeight(contentElement.scrollHeight);
    };

    updateMeasuredHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateMeasuredHeight();
    });

    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <SurfaceCard className={styles.settingsGroup}>
      <LobbySectionHeader
        description="Tokens for skips, buys, and challenges."
        title={
          <span className={styles.ttModeTitle}>
            {/* <TtTokenIcon className={styles.ttModeTitleIcon} /> */}

            <span>TuneTrack token mode</span>
          </span>
        }
        titleAccessory={<SettingInfoButton info={ttModeInfo} label="Token mode" />}
        titleAs="h3"
        variant="compact"
      />

      <label className={styles.tokenModeToggle}>
        <input
          checked={currentSettings.ttModeEnabled}
          className={styles.tokenModeToggleInput}
          onChange={(event) => onToggleTtMode(event.target.checked)}
          type="checkbox"
        />
        <span className={styles.tokenModeToggleCopy}>
          <span className={styles.tokenModeToggleTitleRow}>
            <TtTokenIcon className={styles.tokenModeToggleIcon} />
            <span className={styles.tokenModeToggleTitle}>Enable token mode</span>
          </span>
          <span className={styles.tokenModeToggleHint}>
            Adds skips, instant claims, and Beat! stakes to each round.
          </span>
        </span>
        <span className={styles.tokenModeSwitch} aria-hidden="true">
          <span className={styles.tokenModeSwitchStatus}>
            {currentSettings.ttModeEnabled ? "On" : "Off"}
          </span>
          <span className={styles.tokenModeSwitchThumb} />
        </span>
      </label>

      <motion.p
        animate={createToggleHintFadeMotion(
          reduceMotion,
          currentSettings.ttModeEnabled,
        )}
        className={styles.settingsInlineHint}
        layout="position"
        transition={createStandardTransition(reduceMotion)}
      >
        Turn this on to show token options.
      </motion.p>

      <motion.div
        animate={createMeasuredDisclosureMotion(
          reduceMotion,
          currentSettings.ttModeEnabled,
          ttSettingsContentHeight,
        )}
        initial={false}
        style={{
          overflow: "hidden",
          pointerEvents: currentSettings.ttModeEnabled ? "auto" : "none",
        }}
        transition={createStandardTransition(reduceMotion)}
      >
        <div className={styles.conditionalGroup} ref={ttSettingsContentRef}>
            <RangeField
              info="How many tokens each player receives when the game starts."
              label="Starting tokens for every player"
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
              info="How long players can challenge a placement before it locks in."
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
      </motion.div>
    </SurfaceCard>
  );
}
