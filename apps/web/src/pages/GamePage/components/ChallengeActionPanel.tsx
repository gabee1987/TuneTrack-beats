import type { PublicRoomState } from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  MotionPresence,
  createChallengePanelMotion,
  createStandardTransition,
} from "../../../features/motion";
import { TtTokenAmount } from "../../../features/ui/TtToken";
import styles from "./GamePageActionPanels.module.css";
import { ActionDock, PrimaryActionButton, SecondaryActionButton } from "./ActionDock";

function parseCountdownSeconds(challengeCountdownLabel: string | null): number | null {
  if (!challengeCountdownLabel) {
    return null;
  }

  const match = challengeCountdownLabel.match(/(\d+)\s*s\b/i);
  if (!match || !match[1]) {
    return null;
  }

  const parsedSeconds = Number.parseInt(match[1], 10);
  return Number.isFinite(parsedSeconds) ? parsedSeconds : null;
}

function getCountdownStageClassName(
  countdownSeconds: number | null,
): "challengeCalloutStageYellow" | "challengeCalloutStageOrange" | "challengeCalloutStageRed" {
  switch (true) {
    case countdownSeconds !== null && countdownSeconds <= 3:
      return "challengeCalloutStageRed";
    case countdownSeconds !== null && countdownSeconds <= 7:
      return "challengeCalloutStageOrange";
    default:
      return "challengeCalloutStageYellow";
  }
}

interface ChallengeActionPanelProps {
  canClaimChallenge: boolean;
  canConfirmBeatPlacement: boolean;
  canResolveChallengeWindow: boolean;
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  currentPlayerTtCount: number;
  handleClaimChallenge: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  onTokenSpendAnimationStart?: (payload: {
    amount: number;
    originX: number;
    originY: number;
  }) => void;
  roomState: PublicRoomState;
}

export function ChallengeActionPanel({
  canClaimChallenge,
  canConfirmBeatPlacement,
  canResolveChallengeWindow,
  challengeActionBody,
  challengeActionTitle,
  challengeCountdownLabel,
  currentPlayerTtCount,
  handleClaimChallenge,
  handlePlaceChallenge,
  handleResolveChallengeWindow,
  onTokenSpendAnimationStart,
  roomState,
}: ChallengeActionPanelProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const beatCostBadgeRef = useRef<HTMLSpanElement | null>(null);

  const challengeState = roomState.status === "challenge" ? roomState.challengeState : null;

  const challengeStatusText = challengeCountdownLabel
    ? challengeCountdownLabel
    : challengeState?.phase === "claimed"
      ? "Beat! was claimed. Waiting for the placement."
      : "Host resolves this window manually";
  const isOpenChallengeWindow = challengeState?.phase === "open";
  const hasTimedChallengeWindow = isOpenChallengeWindow && Boolean(challengeCountdownLabel);
  const countdownSeconds = parseCountdownSeconds(challengeCountdownLabel);
  const countdownStageClassName = styles[getCountdownStageClassName(countdownSeconds)];
  const panelClassName = `${styles.challengeCallout} ${countdownStageClassName}`;
  const titleText = challengeState?.phase === "open" ? "Make your Beat!" : challengeActionTitle;
  const bodyText =
    challengeState?.phase === "open"
      ? "Think the placement is wrong? Call Beat before the window closes."
      : challengeActionBody;
  function resolveSpendOrigin(
    fallbackButton: HTMLButtonElement,
    badgeElement: HTMLSpanElement | null,
  ) {
    const sourceElement = badgeElement ?? fallbackButton;
    const sourceBounds = sourceElement.getBoundingClientRect();
    return {
      originX: sourceBounds.left + sourceBounds.width / 2,
      originY: sourceBounds.top + sourceBounds.height / 2,
    };
  }

  const actionDock = isOpenChallengeWindow ? (
    canClaimChallenge || canResolveChallengeWindow ? (
      <ActionDock>
        {canClaimChallenge ? (
          <PrimaryActionButton
            onClick={(event) => {
              const origin = resolveSpendOrigin(
                event.currentTarget,
                beatCostBadgeRef.current,
              );
              onTokenSpendAnimationStart?.({
                amount: -1,
                ...origin,
              });
              handleClaimChallenge();
            }}
            ttCost={1}
            ttCostBadgeRef={beatCostBadgeRef}
          >
            Beat!
          </PrimaryActionButton>
        ) : null}
        {canResolveChallengeWindow ? (
          <SecondaryActionButton onClick={handleResolveChallengeWindow}>
            Resolve
          </SecondaryActionButton>
        ) : null}
      </ActionDock>
    ) : null
  ) : canConfirmBeatPlacement ? (
    <ActionDock>
      <PrimaryActionButton onClick={handlePlaceChallenge}>Confirm Beat</PrimaryActionButton>
    </ActionDock>
  ) : null;

  return (
    <>
      <MotionPresence>
        {challengeState ? (
          <motion.section
            animate="animate"
            aria-live="polite"
            className={panelClassName}
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
              <p className={styles.challengeEyebrow}>Limited time</p>
              <h3 className={styles.challengeTitle}>{titleText}</h3>
              {bodyText ? <p className={styles.challengeText}>{bodyText}</p> : null}

              <div className={styles.challengeCountdownBadge}>
                <span className={styles.challengeCountdownDot} aria-hidden="true" />
                <span>{challengeStatusText}</span>
              </div>

              {roomState.settings.ttModeEnabled ? (
                <span className={styles.challengeTokenChip}>
                  Your tokens <TtTokenAmount amount={currentPlayerTtCount} />
                </span>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </MotionPresence>
      {challengeState ? actionDock : null}
    </>
  );
}
