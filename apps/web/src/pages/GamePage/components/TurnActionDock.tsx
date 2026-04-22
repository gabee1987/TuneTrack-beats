import {
  BUY_TIMELINE_CARD_TT_COST,
  SKIP_TRACK_TT_COST,
  type PublicRoomState,
} from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import {
  MotionPresence,
  createActionButtonExitMotion,
  createLayoutTransition,
} from "../../../features/motion";
import {
  ActionDock,
  PrimaryActionButton,
  SecondaryActionButton,
} from "./ActionDock";
import styles from "./GamePageActionPanels.module.css";

interface TurnActionDockProps {
  canConfirmTurnPlacement: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  handleBuyTimelineCardWithTt: () => void;
  handlePlaceCard: () => void;
  handleSkipTrackWithTt: () => void;
  roomState: PublicRoomState;
}

export function TurnActionDock({
  canConfirmTurnPlacement,
  canUseBuyCard,
  canUseSkipTrack,
  handleBuyTimelineCardWithTt,
  handlePlaceCard,
  handleSkipTrackWithTt,
  roomState,
}: TurnActionDockProps) {
  const reduceMotion = useReducedMotion() ?? false;

  if (
    roomState.status !== "turn" ||
    (!canUseSkipTrack && !canUseBuyCard && !canConfirmTurnPlacement)
  ) {
    return null;
  }

  return (
    <ActionDock>
      <MotionPresence mode="sync">
        {canUseSkipTrack ? (
          <motion.span
            animate="animate"
            className={styles.actionButtonMotionWrap}
            exit="exit"
            initial="initial"
            key="skip-track"
            layout
            style={{ originX: 0.5 }}
            transition={createLayoutTransition(reduceMotion)}
            variants={createActionButtonExitMotion(reduceMotion)}
          >
            <SecondaryActionButton
              onClick={handleSkipTrackWithTt}
              ttCost={SKIP_TRACK_TT_COST}
            >
              Skip
            </SecondaryActionButton>
          </motion.span>
        ) : null}
      </MotionPresence>
      {canUseBuyCard ? (
        <motion.span
          className={styles.actionButtonMotionWrap}
          layout
          transition={createLayoutTransition(reduceMotion)}
        >
          <SecondaryActionButton
            onClick={handleBuyTimelineCardWithTt}
            ttCost={BUY_TIMELINE_CARD_TT_COST}
          >
            Buy
          </SecondaryActionButton>
        </motion.span>
      ) : null}
      {canConfirmTurnPlacement ? (
        <motion.span
          className={styles.actionButtonMotionWrap}
          layout
          transition={createLayoutTransition(reduceMotion)}
        >
          <PrimaryActionButton onClick={handlePlaceCard}>
            Confirm
          </PrimaryActionButton>
        </motion.span>
      ) : null}
    </ActionDock>
  );
}
