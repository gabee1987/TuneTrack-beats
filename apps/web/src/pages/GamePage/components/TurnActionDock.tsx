import {
  BUY_TIMELINE_CARD_TT_COST,
  SKIP_TRACK_TT_COST,
  type PublicRoomState,
} from "@tunetrack/shared";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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

function useTurnSkipCountdown(deadlineEpochMs: number | null): string | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (deadlineEpochMs === null) {
      setSecondsLeft(null);
      return;
    }

    function update() {
      const remaining = deadlineEpochMs! - Date.now();
      setSecondsLeft(remaining > 0 ? Math.ceil(remaining / 1000) : null);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadlineEpochMs]);

  return secondsLeft !== null ? `${secondsLeft}s` : null;
}

interface TurnActionDockProps {
  canConfirmTurnPlacement: boolean;
  canSkipOfflinePlayer: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  handleBuyTimelineCardWithTt: () => void;
  handlePlaceCard: () => void;
  handleSkipOfflinePlayer: () => void;
  handleSkipTrackWithTt: () => void;
  onTokenSpendAnimationStart?: (payload: {
    amount: number;
    originX: number;
    originY: number;
  }) => void;
  roomState: PublicRoomState;
}

export function TurnActionDock({
  canConfirmTurnPlacement,
  canSkipOfflinePlayer,
  canUseBuyCard,
  canUseSkipTrack,
  handleBuyTimelineCardWithTt,
  handlePlaceCard,
  handleSkipOfflinePlayer,
  handleSkipTrackWithTt,
  onTokenSpendAnimationStart,
  roomState,
}: TurnActionDockProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const skipCostBadgeRef = useRef<HTMLSpanElement | null>(null);
  const buyCostBadgeRef = useRef<HTMLSpanElement | null>(null);
  const offlinePlayerName = canSkipOfflinePlayer
    ? (roomState.players.find((p) => p.id === roomState.turn?.activePlayerId)?.displayName ?? "Player")
    : null;
  const turnSkipCountdown = useTurnSkipCountdown(
    canSkipOfflinePlayer ? (roomState.turn?.turnSkipDeadlineEpochMs ?? null) : null,
  );

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

  if (
    roomState.status !== "turn" ||
    (!canUseSkipTrack && !canUseBuyCard && !canConfirmTurnPlacement && !canSkipOfflinePlayer)
  ) {
    return null;
  }

  return (
    <>
      {canSkipOfflinePlayer && offlinePlayerName ? (
        <div className={styles.offlinePlayerPanel}>
          <div className={styles.offlinePlayerInfo}>
            <span className={styles.offlinePlayerLabel}>Waiting for</span>
            <span className={styles.offlinePlayerName}>{offlinePlayerName}</span>
          </div>
          {turnSkipCountdown ? (
            <span className={styles.offlinePlayerCountdown}>
              Auto-skip in {turnSkipCountdown}
            </span>
          ) : null}
        </div>
      ) : null}
      <ActionDock>
      <MotionPresence mode="popLayout">
        {canUseSkipTrack ? (
          <motion.span
            animate="animate"
            className={styles.actionButtonMotionWrap}
            exit="exit"
            initial="initial"
            key="skip-track"
            layout="position"
            style={{ originX: 0.5 }}
            transition={createLayoutTransition(reduceMotion)}
            variants={createActionButtonExitMotion(reduceMotion)}
          >
            <SecondaryActionButton
              onClick={(event) => {
                const origin = resolveSpendOrigin(
                  event.currentTarget,
                  skipCostBadgeRef.current,
                );
                onTokenSpendAnimationStart?.({
                  amount: -SKIP_TRACK_TT_COST,
                  ...origin,
                });
                handleSkipTrackWithTt();
              }}
              ttCost={SKIP_TRACK_TT_COST}
              ttCostBadgeRef={skipCostBadgeRef}
            >
              Skip
            </SecondaryActionButton>
          </motion.span>
        ) : null}
      </MotionPresence>
      {canUseBuyCard ? (
        <motion.span
          className={styles.actionButtonMotionWrap}
          layout="position"
          transition={createLayoutTransition(reduceMotion)}
        >
          <SecondaryActionButton
            onClick={(event) => {
              const origin = resolveSpendOrigin(
                event.currentTarget,
                buyCostBadgeRef.current,
              );
              onTokenSpendAnimationStart?.({
                amount: -BUY_TIMELINE_CARD_TT_COST,
                ...origin,
              });
              handleBuyTimelineCardWithTt();
            }}
            ttCost={BUY_TIMELINE_CARD_TT_COST}
            ttCostBadgeRef={buyCostBadgeRef}
          >
            Buy
          </SecondaryActionButton>
        </motion.span>
      ) : null}
      {canConfirmTurnPlacement ? (
        <motion.span
          className={styles.actionButtonMotionWrap}
          layout="position"
          transition={createLayoutTransition(reduceMotion)}
        >
          <PrimaryActionButton onClick={() => handlePlaceCard()}>
            Confirm
          </PrimaryActionButton>
        </motion.span>
      ) : null}
      {canSkipOfflinePlayer ? (
        <motion.span
          className={styles.actionButtonMotionWrap}
          layout="position"
          transition={createLayoutTransition(reduceMotion)}
        >
          <SecondaryActionButton onClick={() => handleSkipOfflinePlayer()}>
            Skip Turn
          </SecondaryActionButton>
        </motion.span>
      ) : null}
    </ActionDock>
    </>
  );
}
