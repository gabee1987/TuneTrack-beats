import { createPortal } from "react-dom";
import { motion } from "framer-motion";
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
import styles from "./GamePageActionPanels.module.css";

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
    canClaimChallenge,
    canConfirmBeatPlacement,
    canConfirmReveal,
    canConfirmTurnPlacement,
    canResolveChallengeWindow,
    canUseBuyCard,
    canUseSkipTrack,
    challengeActionBody,
    challengeActionTitle,
    currentPlayerTtCount,
    getPlayerName,
    handleBuyTimelineCardWithTt,
    handleClaimChallenge,
    handleConfirmReveal,
    handlePlaceCard,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    handleSkipTrackWithTt,
    isCurrentPlayerTurn,
    roomState,
    showHelperLabels,
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
                  <motion.span
                    animate="animate"
                    className={styles.tokenSpendFlyout}
                    initial="initial"
                    onAnimationComplete={() => clearTokenSpendFlyout(flyout.key)}
                    transition={createTokenSpendFlyoutTransition(reduceMotion)}
                    variants={createTokenSpendFlyoutVariants(reduceMotion)}
                  >
                    <motion.span
                      animate="animate"
                      className={styles.tokenSpendFlyoutContent}
                      initial="initial"
                      transition={createMenuTokenAdjustFlyoutPopTransition(reduceMotion)}
                      variants={createMenuTokenAdjustFlyoutPopVariants(reduceMotion)}
                    >
                      <span className={styles.tokenSpendFlyoutAmount}>{flyout.amount}</span>
                      <TtTokenIcon className={styles.tokenSpendIcon} />
                    </motion.span>
                  </motion.span>
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
        currentPlayerTtCount={currentPlayerTtCount}
        handleClaimChallenge={handleClaimChallenge}
        handlePlaceChallenge={handlePlaceChallenge}
        handleResolveChallengeWindow={handleResolveChallengeWindow}
        isCurrentPlayerTurn={isCurrentPlayerTurn}
        onTokenSpendAnimationStart={handleTokenSpendAnimationStart}
        roomState={roomState}
      />

      <FinishedStatePanel
        currentPlayerId={model.currentPlayerId}
        getPlayerName={getPlayerName}
        roomState={roomState}
        showHelperLabels={showHelperLabels}
      />

      <RevealActionDock
        canConfirmReveal={canConfirmReveal}
        handleConfirmReveal={handleConfirmReveal}
        roomState={roomState}
      />

      <TurnActionDock
        canConfirmTurnPlacement={canConfirmTurnPlacement}
        canSkipOfflinePlayer={model.canSkipOfflinePlayer}
        canUseBuyCard={canUseBuyCard}
        canUseSkipTrack={canUseSkipTrack}
        handleBuyTimelineCardWithTt={handleBuyTimelineCardWithTt}
        handlePlaceCard={handlePlaceCard}
        handleSkipOfflinePlayer={model.handleSkipTurn}
        handleSkipTrackWithTt={handleSkipTrackWithTt}
        onTokenSpendAnimationStart={handleTokenSpendAnimationStart}
        roomState={roomState}
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
    previousModel.challengeActionBody === nextModel.challengeActionBody &&
    previousModel.challengeActionTitle === nextModel.challengeActionTitle &&
    previousModel.currentPlayerTtCount === nextModel.currentPlayerTtCount &&
    previousModel.getPlayerName === nextModel.getPlayerName &&
    previousModel.handleBuyTimelineCardWithTt === nextModel.handleBuyTimelineCardWithTt &&
    previousModel.handleClaimChallenge === nextModel.handleClaimChallenge &&
    previousModel.handleConfirmReveal === nextModel.handleConfirmReveal &&
    previousModel.handlePlaceCard === nextModel.handlePlaceCard &&
    previousModel.handlePlaceChallenge === nextModel.handlePlaceChallenge &&
    previousModel.handleResolveChallengeWindow === nextModel.handleResolveChallengeWindow &&
    previousModel.handleSkipTrackWithTt === nextModel.handleSkipTrackWithTt &&
    previousModel.handleSkipTurn === nextModel.handleSkipTurn &&
    previousModel.isCurrentPlayerTurn === nextModel.isCurrentPlayerTurn &&
    previousModel.roomState === nextModel.roomState &&
    previousModel.showHelperLabels === nextModel.showHelperLabels
  );
}

export const GamePageActionPanels = memo(
  GamePageActionPanelsComponent,
  (previousProps, nextProps) => areActionPanelModelsEqual(previousProps.model, nextProps.model),
);
