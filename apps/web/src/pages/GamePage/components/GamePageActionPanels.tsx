import { createPortal } from "react-dom";
import { m } from "framer-motion";
import { memo, useRef, useState } from "react";
import {
  MotionPresence,
  createMenuTokenAdjustFlyoutPopTransition,
  createMenuTokenAdjustFlyoutPopVariants,
  createTokenSpendFlyoutTransition,
  createTokenSpendFlyoutVariants,
  useReducedMotionPreference,
} from "../../../features/motion";
import { TtTokenIcon } from "../../../features/ui/TtToken";
import type { GamePageActionPanelsModel } from "../GamePage.types";
import { ChallengeActionPanel } from "./ChallengeActionPanel";
import { FinishedStatePanel } from "./FinishedStatePanel";
import { RevealActionDock } from "./RevealActionDock";
import { TurnActionDock } from "./TurnActionDock";
import styles from "./gamePageActionPanelsDock.module.css";

interface GamePageActionPanelsProps {
  model: GamePageActionPanelsModel;
}

interface TokenSpendFlyoutState {
  amount: number;
  key: number;
  originX: number;
  originY: number;
}

function GamePageActionPanelsComponent({ model }: GamePageActionPanelsProps) {
  const reduceMotion = useReducedMotionPreference();
  const animationKeyRef = useRef(0);
  const [tokenSpendFlyouts, setTokenSpendFlyouts] = useState<TokenSpendFlyoutState[]>([]);
  const {
    buyTimelineCardActionStatus,
    canClaimChallenge,
    canConfirmBeatPlacement,
    canConfirmReveal,
    canConfirmTurnPlacement,
    canResolveChallengeWindow,
    canUseBuyCard,
    canUseSkipTrack,
    challengeActionBody,
    challengeActionTitle,
    challengeDeadlineEpochMs,
    challengePhase,
    claimChallengeActionStatus,
    confirmRevealActionStatus,
    currentPlayerTtCount,
    handleBuyTimelineCardWithTt,
    handleClaimChallenge,
    handleConfirmReveal,
    handlePlaceCard,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    handleSkipTrackWithTt,
    isCurrentPlayerTurn,
    isClaimChallengePending,
    isConfirmRevealPending,
    isBuyTimelineCardPending,
    isPlaceCardPending,
    isPlaceChallengePending,
    isResolveChallengeWindowPending,
    isSkipTrackPending,
    isSkipTurnPending,
    placeCardActionStatus,
    placeChallengeActionStatus,
    resolveChallengeWindowActionStatus,
    skipTrackActionStatus,
    skipTurnActionStatus,
    showHelperLabels,
    skipCandidateName,
    status,
    ttModeEnabled,
    turnSkipDeadlineEpochMs,
    winnerPlayerId,
    winnerPlayerName,
  } = model;

  function handleTokenSpendAnimationStart(payload: {
    amount: number;
    originX: number;
    originY: number;
  }) {
    animationKeyRef.current += 1;
    setTokenSpendFlyouts((currentFlyouts) => [
      ...currentFlyouts,
      {
        amount: payload.amount,
        key: animationKeyRef.current,
        originX: payload.originX,
        originY: payload.originY,
      },
    ]);
  }

  function clearTokenSpendFlyout(animationKey: number) {
    setTokenSpendFlyouts((currentFlyouts) =>
      currentFlyouts.filter((flyout) => flyout.key !== animationKey),
    );
  }

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(
            <MotionPresence mode="sync">
              {tokenSpendFlyouts.map((flyout) => (
                <span
                  aria-hidden="true"
                  className={styles.tokenSpendFlyoutAnchor}
                  key={flyout.key}
                  style={{ left: flyout.originX, top: flyout.originY - 28 }}
                >
                  <m.span
                    animate="animate"
                    className={styles.tokenSpendFlyout}
                    initial="initial"
                    onAnimationComplete={() => clearTokenSpendFlyout(flyout.key)}
                    transition={createTokenSpendFlyoutTransition(reduceMotion)}
                    variants={createTokenSpendFlyoutVariants(reduceMotion)}
                  >
                    <m.span
                      animate="animate"
                      className={styles.tokenSpendFlyoutContent}
                      initial="initial"
                      transition={createMenuTokenAdjustFlyoutPopTransition(reduceMotion)}
                      variants={createMenuTokenAdjustFlyoutPopVariants(reduceMotion)}
                    >
                      <span className={styles.tokenSpendFlyoutAmount}>{flyout.amount}</span>
                      <TtTokenIcon className={styles.tokenSpendIcon} />
                    </m.span>
                  </m.span>
                </span>
              ))}
            </MotionPresence>,
            document.body,
          )
        : null}

      <ChallengeActionPanel
        canClaimChallenge={canClaimChallenge}
        canConfirmBeatPlacement={canConfirmBeatPlacement}
        canResolveChallengeWindow={canResolveChallengeWindow}
        challengeActionBody={challengeActionBody}
        challengeActionTitle={challengeActionTitle}
        challengeDeadlineEpochMs={challengeDeadlineEpochMs}
        challengePhase={challengePhase}
        claimChallengeActionStatus={claimChallengeActionStatus}
        currentPlayerTtCount={currentPlayerTtCount}
        handleClaimChallenge={handleClaimChallenge}
        handlePlaceChallenge={handlePlaceChallenge}
        handleResolveChallengeWindow={handleResolveChallengeWindow}
        isCurrentPlayerTurn={isCurrentPlayerTurn}
        isClaimChallengePending={isClaimChallengePending}
        isPlaceChallengePending={isPlaceChallengePending}
        isResolveChallengeWindowPending={isResolveChallengeWindowPending}
        onTokenSpendAnimationStart={handleTokenSpendAnimationStart}
        placeChallengeActionStatus={placeChallengeActionStatus}
        resolveChallengeWindowActionStatus={resolveChallengeWindowActionStatus}
        ttModeEnabled={ttModeEnabled}
      />

      <FinishedStatePanel
        currentPlayerId={model.currentPlayerId}
        showHelperLabels={showHelperLabels}
        status={status}
        winnerPlayerId={winnerPlayerId}
        winnerPlayerName={winnerPlayerName}
      />

      <RevealActionDock
        canConfirmReveal={canConfirmReveal}
        confirmRevealActionStatus={confirmRevealActionStatus}
        handleConfirmReveal={handleConfirmReveal}
        isConfirmRevealPending={isConfirmRevealPending}
        status={status}
      />

      <TurnActionDock
        buyTimelineCardActionStatus={buyTimelineCardActionStatus}
        canConfirmTurnPlacement={canConfirmTurnPlacement}
        canSkipOfflinePlayer={model.canSkipOfflinePlayer}
        canUseBuyCard={canUseBuyCard}
        canUseSkipTrack={canUseSkipTrack}
        handleBuyTimelineCardWithTt={handleBuyTimelineCardWithTt}
        handlePlaceCard={handlePlaceCard}
        handleSkipOfflinePlayer={model.handleSkipTurn}
        handleSkipTrackWithTt={handleSkipTrackWithTt}
        isBuyTimelineCardPending={isBuyTimelineCardPending}
        isPlaceCardPending={isPlaceCardPending}
        isSkipTrackPending={isSkipTrackPending}
        isSkipTurnPending={isSkipTurnPending}
        placeCardActionStatus={placeCardActionStatus}
        onTokenSpendAnimationStart={handleTokenSpendAnimationStart}
        skipCandidateName={skipCandidateName}
        skipTrackActionStatus={skipTrackActionStatus}
        skipTurnActionStatus={skipTurnActionStatus}
        status={status}
        turnSkipDeadlineEpochMs={turnSkipDeadlineEpochMs}
      />
    </>
  );
}

function areActionPanelModelsEqual(
  previousModel: GamePageActionPanelsModel,
  nextModel: GamePageActionPanelsModel,
): boolean {
  return (
    previousModel.canClaimChallenge === nextModel.canClaimChallenge &&
    previousModel.canConfirmBeatPlacement === nextModel.canConfirmBeatPlacement &&
    previousModel.canConfirmReveal === nextModel.canConfirmReveal &&
    previousModel.canConfirmTurnPlacement === nextModel.canConfirmTurnPlacement &&
    previousModel.canResolveChallengeWindow === nextModel.canResolveChallengeWindow &&
    previousModel.canSkipOfflinePlayer === nextModel.canSkipOfflinePlayer &&
    previousModel.canUseBuyCard === nextModel.canUseBuyCard &&
    previousModel.canUseSkipTrack === nextModel.canUseSkipTrack &&
    previousModel.buyTimelineCardActionStatus === nextModel.buyTimelineCardActionStatus &&
    previousModel.challengeActionBody === nextModel.challengeActionBody &&
    previousModel.challengeActionTitle === nextModel.challengeActionTitle &&
    previousModel.challengeDeadlineEpochMs === nextModel.challengeDeadlineEpochMs &&
    previousModel.challengePhase === nextModel.challengePhase &&
    previousModel.claimChallengeActionStatus === nextModel.claimChallengeActionStatus &&
    previousModel.confirmRevealActionStatus === nextModel.confirmRevealActionStatus &&
    previousModel.currentPlayerTtCount === nextModel.currentPlayerTtCount &&
    previousModel.handleBuyTimelineCardWithTt === nextModel.handleBuyTimelineCardWithTt &&
    previousModel.handleClaimChallenge === nextModel.handleClaimChallenge &&
    previousModel.handleConfirmReveal === nextModel.handleConfirmReveal &&
    previousModel.handlePlaceCard === nextModel.handlePlaceCard &&
    previousModel.handlePlaceChallenge === nextModel.handlePlaceChallenge &&
    previousModel.handleResolveChallengeWindow === nextModel.handleResolveChallengeWindow &&
    previousModel.handleSkipTrackWithTt === nextModel.handleSkipTrackWithTt &&
    previousModel.handleSkipTurn === nextModel.handleSkipTurn &&
    previousModel.isCurrentPlayerTurn === nextModel.isCurrentPlayerTurn &&
    previousModel.isClaimChallengePending === nextModel.isClaimChallengePending &&
    previousModel.isConfirmRevealPending === nextModel.isConfirmRevealPending &&
    previousModel.isBuyTimelineCardPending === nextModel.isBuyTimelineCardPending &&
    previousModel.isPlaceCardPending === nextModel.isPlaceCardPending &&
    previousModel.isPlaceChallengePending === nextModel.isPlaceChallengePending &&
    previousModel.isResolveChallengeWindowPending === nextModel.isResolveChallengeWindowPending &&
    previousModel.isSkipTrackPending === nextModel.isSkipTrackPending &&
    previousModel.isSkipTurnPending === nextModel.isSkipTurnPending &&
    previousModel.placeCardActionStatus === nextModel.placeCardActionStatus &&
    previousModel.placeChallengeActionStatus === nextModel.placeChallengeActionStatus &&
    previousModel.resolveChallengeWindowActionStatus ===
      nextModel.resolveChallengeWindowActionStatus &&
    previousModel.skipTrackActionStatus === nextModel.skipTrackActionStatus &&
    previousModel.skipTurnActionStatus === nextModel.skipTurnActionStatus &&
    previousModel.showHelperLabels === nextModel.showHelperLabels &&
    previousModel.skipCandidateName === nextModel.skipCandidateName &&
    previousModel.status === nextModel.status &&
    previousModel.ttModeEnabled === nextModel.ttModeEnabled &&
    previousModel.turnSkipDeadlineEpochMs === nextModel.turnSkipDeadlineEpochMs &&
    previousModel.winnerPlayerId === nextModel.winnerPlayerId &&
    previousModel.winnerPlayerName === nextModel.winnerPlayerName
  );
}

export const GamePageActionPanels = memo(
  GamePageActionPanelsComponent,
  (previousProps, nextProps) => areActionPanelModelsEqual(previousProps.model, nextProps.model),
);
