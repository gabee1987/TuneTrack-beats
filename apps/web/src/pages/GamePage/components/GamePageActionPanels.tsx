import { motion, useReducedMotion } from "framer-motion";
import { memo } from "react";
import {
  MotionPresence,
  createExpressiveTransition,
  createTokenSpendFlyoutVariants,
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

function GamePageActionPanelsComponent({ model }: GamePageActionPanelsProps) {
  const reduceMotion = useReducedMotion() ?? false;
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
    challengeCountdownLabel,
    currentPlayerTtCount,
    getPlayerName,
    handleBuyTimelineCardWithTt,
    handleClaimChallenge,
    handleConfirmReveal,
    handlePlaceCard,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    handleSkipTrackWithTt,
    roomState,
    showHelperLabels,
    skipTrackSpendAnimationKey,
  } = model;
  const tokenSpendFlyoutVariants = createTokenSpendFlyoutVariants(reduceMotion);

  return (
    <>
      <MotionPresence mode="sync">
        {skipTrackSpendAnimationKey > 0 ? (
          <motion.span
            animate="animate"
            aria-hidden="true"
            className={styles.tokenSpendFlyout}
            initial="initial"
            key={skipTrackSpendAnimationKey}
            transition={createExpressiveTransition(reduceMotion)}
            variants={tokenSpendFlyoutVariants}
          >
            <TtTokenIcon className={styles.tokenSpendIcon} />
          </motion.span>
        ) : null}
      </MotionPresence>

      <ChallengeActionPanel
        canClaimChallenge={canClaimChallenge}
        canConfirmBeatPlacement={canConfirmBeatPlacement}
        canResolveChallengeWindow={canResolveChallengeWindow}
        challengeActionBody={challengeActionBody}
        challengeActionTitle={challengeActionTitle}
        challengeCountdownLabel={challengeCountdownLabel}
        currentPlayerTtCount={currentPlayerTtCount}
        handleClaimChallenge={handleClaimChallenge}
        handlePlaceChallenge={handlePlaceChallenge}
        handleResolveChallengeWindow={handleResolveChallengeWindow}
        roomState={roomState}
      />

      <FinishedStatePanel
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
        canUseBuyCard={canUseBuyCard}
        canUseSkipTrack={canUseSkipTrack}
        handleBuyTimelineCardWithTt={handleBuyTimelineCardWithTt}
        handlePlaceCard={handlePlaceCard}
        handleSkipTrackWithTt={handleSkipTrackWithTt}
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
    previousModel.canUseBuyCard === nextModel.canUseBuyCard &&
    previousModel.canUseSkipTrack === nextModel.canUseSkipTrack &&
    previousModel.challengeActionBody === nextModel.challengeActionBody &&
    previousModel.challengeActionTitle === nextModel.challengeActionTitle &&
    previousModel.challengeCountdownLabel === nextModel.challengeCountdownLabel &&
    previousModel.currentPlayerTtCount === nextModel.currentPlayerTtCount &&
    previousModel.getPlayerName === nextModel.getPlayerName &&
    previousModel.handleBuyTimelineCardWithTt === nextModel.handleBuyTimelineCardWithTt &&
    previousModel.handleClaimChallenge === nextModel.handleClaimChallenge &&
    previousModel.handleConfirmReveal === nextModel.handleConfirmReveal &&
    previousModel.handlePlaceCard === nextModel.handlePlaceCard &&
    previousModel.handlePlaceChallenge === nextModel.handlePlaceChallenge &&
    previousModel.handleResolveChallengeWindow === nextModel.handleResolveChallengeWindow &&
    previousModel.handleSkipTrackWithTt === nextModel.handleSkipTrackWithTt &&
    previousModel.roomState === nextModel.roomState &&
    previousModel.showHelperLabels === nextModel.showHelperLabels &&
    previousModel.skipTrackSpendAnimationKey === nextModel.skipTrackSpendAnimationKey
  );
}

export const GamePageActionPanels = memo(
  GamePageActionPanelsComponent,
  (previousProps, nextProps) =>
    areActionPanelModelsEqual(previousProps.model, nextProps.model),
);
