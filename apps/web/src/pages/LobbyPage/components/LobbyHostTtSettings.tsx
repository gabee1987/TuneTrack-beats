import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
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
import { useI18n } from "../../../features/i18n";
import { SettingField, SettingInfoButton } from "../../../features/ui/SettingField";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { ToggleSwitch } from "../../../features/ui/ToggleSwitch";
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
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const challengeWindowOptionValues = getChallengeWindowOptionValueMap();
  const ttSettingsContentRef = useRef<HTMLDivElement | null>(null);
  const [ttSettingsContentHeight, setTtSettingsContentHeight] = useState(0);
  const tokenIcon = <TtTokenIcon className={styles.inlineTtTokenIcon} />;
  const oneToken = <TtTokenAmount amount={1} />;
  const threeTokens = <TtTokenAmount amount={3} />;
  const ttModeInfo: ReactNode = (
    <span className={styles.ttInfoStack}>
      <span>
        <strong>{t("lobby.host.ttInfo.title")}</strong>
        <span>{renderLocalizedNodes(t("lobby.host.ttInfo.body"), { token: tokenIcon })}</span>
      </span>
      <span>
        <strong>{t("lobby.host.ttInfo.earnTitle")}</strong>
        <span>{renderLocalizedNodes(t("lobby.host.ttInfo.earnBody"), { token: tokenIcon })}</span>
      </span>
      <span>
        <strong>{t("lobby.host.ttInfo.spendTitle")}</strong>
        <span>
          {renderLocalizedNodes(t("lobby.host.ttInfo.spendBody"), {
            oneToken,
            threeTokens,
          })}
        </span>
      </span>
      <span>
        <strong>{t("lobby.host.ttInfo.challengeTitle")}</strong>
        <span>
          {renderLocalizedNodes(t("lobby.host.ttInfo.challengeBody"), {
            oneToken,
          })}
        </span>
      </span>
      <span>
        <strong>{t("lobby.host.ttInfo.timingTitle")}</strong>
        <span>{t("lobby.host.ttInfo.timingBody")}</span>
      </span>
    </span>
  );

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
        description={t("lobby.host.tokenDescription")}
        title={
          <span className={styles.ttModeTitle}>
            {/* <TtTokenIcon className={styles.ttModeTitleIcon} /> */}

            <span>{t("lobby.host.tokenMode")}</span>
          </span>
        }
        titleAccessory={
          <SettingInfoButton info={ttModeInfo} label={t("lobby.host.tokenModeInfoLabel")} />
        }
        titleAs="h3"
        variant="compact"
      />

      <div className={styles.tokenModeToggle}>
        <span className={styles.tokenModeToggleCopy}>
          <span className={styles.tokenModeToggleTitleRow}>
            <TtTokenIcon className={styles.tokenModeToggleIcon} />
            <span className={styles.tokenModeToggleTitle}>{t("lobby.host.enableTokenMode")}</span>
          </span>
          <span className={styles.tokenModeToggleHint}>{t("lobby.host.enableTokenModeHint")}</span>
        </span>
        <ToggleSwitch
          ariaLabel={t("lobby.host.enableTokenMode")}
          checked={currentSettings.ttModeEnabled}
          onChange={onToggleTtMode}
        />
      </div>

      <motion.p
        animate={createToggleHintFadeMotion(reduceMotion, currentSettings.ttModeEnabled)}
        className={styles.settingsInlineHint}
        layout="position"
        transition={createStandardTransition(reduceMotion)}
      >
        {t("lobby.host.tokenInlineHint")}
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
            info={t("lobby.host.startingTokensInfo")}
            label={t("lobby.host.startingTokens")}
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
            info={t("lobby.host.challengeWindowInfo")}
            label={t("lobby.host.challengeWindow")}
            value={formatChallengeWindowSettingValue(
              currentSettings.challengeWindowDurationSeconds,
              t("lobby.host.challengeWindowManual"),
            )}
          >
            <AdaptiveSelect
              label={t("lobby.host.challengeWindow")}
              onChange={(nextValue) =>
                onRoomSettingsChange({
                  ...currentSettings,
                  challengeWindowDurationSeconds: nextValue === "manual" ? null : Number(nextValue),
                })
              }
              options={[
                {
                  label: t("lobby.host.challengeWindowHostManual"),
                  value: challengeWindowOptionValues.manual,
                },
                {
                  label: t("lobby.host.challengeWindowSeconds", {
                    seconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
                  }),
                  value: challengeWindowOptionValues.defaultDuration,
                },
                {
                  label: t("lobby.host.challengeWindowSeconds", {
                    seconds: MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
                  }),
                  value: challengeWindowOptionValues.minDuration,
                },
                {
                  label: t("lobby.host.challengeWindowSeconds", {
                    seconds: MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
                  }),
                  value: challengeWindowOptionValues.maxDuration,
                },
              ]}
              value={getChallengeWindowSelectValue(currentSettings.challengeWindowDurationSeconds)}
            />
          </SettingField>
        </div>
      </motion.div>
    </SurfaceCard>
  );
}

function renderLocalizedNodes(
  template: string,
  replacements: Record<string, ReactNode>,
): ReactNode {
  const parts = template.split(/(\{\{\w+\}\})/g);

  return parts.map((part, index) => {
    const match = /^\{\{(\w+)\}\}$/.exec(part);
    if (!match) {
      return part;
    }

    const replacementKey = match[1];
    if (!replacementKey) {
      return part;
    }

    return <span key={`${replacementKey}-${index}`}>{replacements[replacementKey] ?? part}</span>;
  });
}
