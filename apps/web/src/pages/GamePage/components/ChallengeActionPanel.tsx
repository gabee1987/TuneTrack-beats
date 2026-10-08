import { CHALLENGE_TT_COST } from "@tunetrack/shared/client";
import { m, useIsPresent } from "framer-motion";
import { useRef, useState } from "react";
import { LayerPortal } from "../../../features/overlay";
import {
  MotionPresence,
  createChallengePanelMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import { useI18n } from "../../../features/i18n";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import { useChallengeCountdownLabel } from "../hooks/useChallengeCountdownLabel";
import type {
  ClaimChallengeActionStatus,
  GamePageChallengePhase,
  PlaceChallengeActionStatus,
  ResolveChallengeWindowActionStatus,
} from "../GamePage.types";
import styles from "./gamePageActionPanelsChallenge.module.css";
import {
  ActionDock,
  PrimaryActionButton,
  SecondaryActionButton,
  useMobileControlPortalTarget,
} from "./ActionDock";

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
  challengeDeadlineEpochMs: number | null;
  /** Null outside the challenge phase. */
  challengePhase: GamePageChallengePhase | null;
  claimChallengeActionStatus: ClaimChallengeActionStatus;
  currentPlayerTtCount: number;
  handleClaimChallenge: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  isClaimChallengePending: boolean;
  isCurrentPlayerTurn: boolean;
  isPlaceChallengePending: boolean;
  isResolveChallengeWindowPending: boolean;
  onTokenSpendAnimationStart?: (payload: {
    amount: number;
    originX: number;
    originY: number;
  }) => void;
  placeChallengeActionStatus: PlaceChallengeActionStatus;
  resolveChallengeWindowActionStatus: ResolveChallengeWindowActionStatus;
  ttModeEnabled: boolean;
}

export function ChallengeActionPanel({
  canClaimChallenge,
  canConfirmBeatPlacement,
  canResolveChallengeWindow,
  challengeActionBody,
  challengeActionTitle,
  challengeDeadlineEpochMs,
  challengePhase,
  claimChallengeActionStatus,
  currentPlayerTtCount,
  handleClaimChallenge,
  handlePlaceChallenge,
  handleResolveChallengeWindow,
  isClaimChallengePending,
  isCurrentPlayerTurn,
  isPlaceChallengePending,
  isResolveChallengeWindowPending,
  onTokenSpendAnimationStart,
  placeChallengeActionStatus,
  resolveChallengeWindowActionStatus,
  ttModeEnabled,
}: ChallengeActionPanelProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const portalTarget = useMobileControlPortalTarget();
  const isPresent = useIsPresent();
  const beatCostBadgeRef = useRef<HTMLSpanElement | null>(null);
  const [challengeHintAnchor, setChallengeHintAnchor] = useState<HTMLElement | null>(null);

  const isOpenChallengeWindow = challengePhase === "open";
  const challengeCountdownLabel = useChallengeCountdownLabel(
    challengeDeadlineEpochMs,
    isOpenChallengeWindow,
  );
  const isManualChallengeWindow = isOpenChallengeWindow && !challengeDeadlineEpochMs;
  const isActivePlayerChallengeView = isOpenChallengeWindow && isCurrentPlayerTurn;

  const challengeStatusText = challengeCountdownLabel
    ? challengeCountdownLabel
    : challengePhase === "claimed"
      ? t("game.challenge.beatWasClaimed")
      : isActivePlayerChallengeView
        ? canResolveChallengeWindow
          ? t("game.challenge.youCloseBeatWindow")
          : t("game.challenge.hostClosesBeatWindow")
        : t("game.challenge.hostClosesBeatWindow");
  const hasTimedChallengeWindow = isOpenChallengeWindow && Boolean(challengeDeadlineEpochMs);
  const countdownSeconds = parseCountdownSeconds(challengeCountdownLabel);
  const countdownStageClassName = styles[getCountdownStageClassName(countdownSeconds)];
  const panelClassName = `${styles.challengeCallout} ${countdownStageClassName}`;
  const titleText =
    challengePhase === "open"
      ? isActivePlayerChallengeView
        ? t("game.challenge.beatWindowOpen")
        : t("game.challenge.callBeat")
      : challengeActionTitle;
  const bodyText =
    challengePhase === "open"
      ? isActivePlayerChallengeView
        ? canResolveChallengeWindow
          ? isManualChallengeWindow
            ? t("game.challenge.yourDropManualCanClose")
            : t("game.challenge.yourDropTimed")
          : isManualChallengeWindow
            ? t("game.challenge.yourDropManualOthers")
            : t("game.challenge.yourDropTimed")
        : isManualChallengeWindow
          ? t("game.challenge.badDropManual")
          : t("game.challenge.badDropTimed")
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

  const nestedDockClassName = portalTarget ? "" : styles.floatingActionDockInChallengeStack;
  const claimChallengeButtonLabel =
    claimChallengeActionStatus === "pending"
      ? t("game.controls.challengeClaimPending")
      : claimChallengeActionStatus === "retrying"
        ? t("game.controls.challengeClaimRetrying")
        : claimChallengeActionStatus === "failed"
          ? t("game.controls.retryChallengeClaim")
          : t("game.controls.beat");
  const placeChallengeButtonLabel =
    placeChallengeActionStatus === "pending"
      ? t("game.controls.challengePlacementPending")
      : placeChallengeActionStatus === "retrying"
        ? t("game.controls.challengePlacementRetrying")
        : placeChallengeActionStatus === "failed"
          ? t("game.controls.retryChallengePlacement")
          : t("game.controls.confirmBeat");
  const resolveChallengeWindowButtonLabel =
    resolveChallengeWindowActionStatus === "retrying"
      ? t("game.controls.challengeResolutionRetrying")
      : resolveChallengeWindowActionStatus === "failed"
        ? t("game.controls.retryChallengeResolution")
        : t("game.controls.resolve");

  const actionDock = isOpenChallengeWindow ? (
    canClaimChallenge || canResolveChallengeWindow ? (
      <ActionDock className={nestedDockClassName}>
        {canClaimChallenge ? (
          <PrimaryActionButton
            buttonRef={setChallengeHintAnchor}
            disabled={isClaimChallengePending}
            onClick={(event) => {
              const origin = resolveSpendOrigin(event.currentTarget, beatCostBadgeRef.current);
              onTokenSpendAnimationStart?.({
                amount: -CHALLENGE_TT_COST,
                ...origin,
              });
              handleClaimChallenge();
            }}
            ttCost={CHALLENGE_TT_COST}
            ttCostBadgeRef={beatCostBadgeRef}
          >
            {claimChallengeButtonLabel}
          </PrimaryActionButton>
        ) : null}
        {canResolveChallengeWindow ? (
          <SecondaryActionButton
            disabled={isResolveChallengeWindowPending}
            onClick={handleResolveChallengeWindow}
          >
            {resolveChallengeWindowButtonLabel}
          </SecondaryActionButton>
        ) : null}
      </ActionDock>
    ) : null
  ) : canConfirmBeatPlacement ? (
    <ActionDock className={nestedDockClassName}>
      <PrimaryActionButton disabled={isPlaceChallengePending} onClick={handlePlaceChallenge}>
        {placeChallengeButtonLabel}
      </PrimaryActionButton>
    </ActionDock>
  ) : null;

  const challengeCallout = (
    <MotionPresence>
      {challengePhase ? (
        <m.section
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
            <h3 className={styles.challengeTitle}>{titleText}</h3>
            {bodyText ? <p className={styles.challengeText}>{bodyText}</p> : null}
            <div className={styles.challengeMetaRow}>
              <div className={styles.challengeCountdownBadge}>
                <span className={styles.challengeCountdownDot} aria-hidden="true" />
                <span>{challengeStatusText}</span>
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

  // Portaled into `document.body`, this outlives the page's exit transform exactly as the
  // action dock does — see the note in `ActionDock`.
  if (portalTarget && !isPresent) {
    return null;
  }

  const challengeHint = (
    <FirstRunHint anchor={challengeHintAnchor} id="game-challenge" isEligible={canClaimChallenge} />
  );

  return portalTarget ? (
    <>
      <LayerPortal>{challengeCallout}</LayerPortal>
      {challengePhase ? actionDock : null}
      {challengeHint}
    </>
  ) : actionDock ? (
    <div className={styles.challengeActionStack}>
      {challengeCallout}
      {actionDock}
      {challengeHint}
    </div>
  ) : (
    <>
      {challengeCallout}
      {challengeHint}
    </>
  );
}
