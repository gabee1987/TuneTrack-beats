import { m } from "framer-motion";
import { type Translate, useI18n } from "../../../../features/i18n";
import {
  MotionPresence,
  createChallengePanelMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../../features/motion";
import { TokenCountAmount } from "../../../../features/ui/TokenCountAmount";
import type { GamePageChallengePhase } from "../../GamePage.types";
import { useChallengeCountdown } from "../../hooks/useChallengeCountdown";
import styles from "../gamePageActionPanelsChallenge.module.css";
import {
  type ChallengeCountdownStage,
  getChallengeCountdownStage,
} from "./challengeCountdownStage";

const STAGE_CLASS_NAME: Record<ChallengeCountdownStage, string | undefined> = {
  yellow: styles.challengeCalloutStageYellow,
  orange: styles.challengeCalloutStageOrange,
  red: styles.challengeCalloutStageRed,
};

interface ChallengeCalloutProps {
  canResolveChallengeWindow: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeDeadlineEpochMs: number | null;
  /** Null outside the challenge phase. */
  challengePhase: GamePageChallengePhase | null;
  currentPlayerTtCount: number;
  isCurrentPlayerTurn: boolean;
  ttModeEnabled: boolean;
}

interface OpenWindowView {
  /** The player whose placement is being challenged. */
  isActivePlayer: boolean;
  canResolve: boolean;
  isManual: boolean;
}

function getOpenWindowTitle(view: OpenWindowView, t: Translate) {
  return view.isActivePlayer ? t("game.challenge.beatWindowOpen") : t("game.challenge.callBeat");
}

function getOpenWindowBody(view: OpenWindowView, t: Translate) {
  if (!view.isActivePlayer) {
    return view.isManual ? t("game.challenge.badDropManual") : t("game.challenge.badDropTimed");
  }
  if (!view.isManual) return t("game.challenge.yourDropTimed");
  return view.canResolve
    ? t("game.challenge.yourDropManualCanClose")
    : t("game.challenge.yourDropManualOthers");
}

function getChallengeStatusText(
  challengePhase: GamePageChallengePhase | null,
  view: OpenWindowView,
  t: Translate,
) {
  if (challengePhase === "claimed") return t("game.challenge.beatWasClaimed");
  return view.isActivePlayer && view.canResolve
    ? t("game.challenge.youCloseBeatWindow")
    : t("game.challenge.hostClosesBeatWindow");
}

export function ChallengeCallout({
  canResolveChallengeWindow,
  challengeActionBody,
  challengeActionTitle,
  challengeDeadlineEpochMs,
  challengePhase,
  currentPlayerTtCount,
  isCurrentPlayerTurn,
  ttModeEnabled,
}: ChallengeCalloutProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const isOpenChallengeWindow = challengePhase === "open";
  const challengeCountdown = useChallengeCountdown(challengeDeadlineEpochMs, isOpenChallengeWindow);
  const openWindowView: OpenWindowView = {
    canResolve: canResolveChallengeWindow,
    isActivePlayer: isOpenChallengeWindow && isCurrentPlayerTurn,
    isManual: isOpenChallengeWindow && !challengeDeadlineEpochMs,
  };
  const hasTimedChallengeWindow = isOpenChallengeWindow && Boolean(challengeDeadlineEpochMs);
  const countdownSeconds = challengeCountdown?.secondsRemaining ?? null;
  const stage = getChallengeCountdownStage(countdownSeconds);
  const titleText = isOpenChallengeWindow
    ? getOpenWindowTitle(openWindowView, t)
    : challengeActionTitle;
  const bodyText = isOpenChallengeWindow
    ? getOpenWindowBody(openWindowView, t)
    : challengeActionBody;
  const statusText =
    challengeCountdown?.label ?? getChallengeStatusText(challengePhase, openWindowView, t);

  return (
    <MotionPresence>
      {challengePhase ? (
        <m.section
          animate="animate"
          aria-live="polite"
          className={`${styles.challengeCallout} ${STAGE_CLASS_NAME[stage]}`}
          exit="exit"
          initial="initial"
          key="challenge-callout"
          transition={createStandardTransition(reduceMotion)}
          variants={createChallengePanelMotion(reduceMotion)}
        >
          {hasTimedChallengeWindow && !reduceMotion ? (
            <span
              aria-hidden="true"
              className={styles.challengePulseBorder}
              key={`challenge-pulse-${countdownSeconds ?? "tick"}`}
            />
          ) : null}
          <div className={styles.challengeCalloutInner}>
            <h3 className={styles.challengeTitle}>{titleText}</h3>
            {bodyText ? <p className={styles.challengeText}>{bodyText}</p> : null}
            <div className={styles.challengeMetaRow}>
              <div className={styles.challengeCountdownBadge}>
                <span className={styles.challengeCountdownDot} aria-hidden="true" />
                <span>{statusText}</span>
              </div>

              {ttModeEnabled ? (
                <span className={styles.challengeTokenChip}>
                  {t("game.challenge.yourTokens")}{" "}
                  <TokenCountAmount amount={currentPlayerTtCount} />
                </span>
              ) : null}
            </div>
          </div>
        </m.section>
      ) : null}
    </MotionPresence>
  );
}
