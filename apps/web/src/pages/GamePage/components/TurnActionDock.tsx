import {
  BUY_TIMELINE_CARD_TT_COST,
  SKIP_TRACK_TT_COST,
  type PublicRoomState,
} from "@tunetrack/shared";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  MotionPresence,
  createActionButtonExitMotion,
  createLayoutTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import { useI18n } from "../../../features/i18n";
import type {
  BuyTimelineCardActionStatus,
  PlaceCardActionStatus,
  SkipTrackActionStatus,
  SkipTurnActionStatus,
} from "../GamePage.types";
import {
  ActionDock,
  PrimaryActionButton,
  SecondaryActionButton,
} from "./ActionDock";
import styles from "./gamePageActionPanelsStyles";

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
  buyTimelineCardActionStatus: BuyTimelineCardActionStatus;
  canConfirmTurnPlacement: boolean;
  canSkipOfflinePlayer: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  handleBuyTimelineCardWithTt: () => void;
  handlePlaceCard: () => void;
  handleSkipOfflinePlayer: () => void;
  handleSkipTrackWithTt: () => void;
  isBuyTimelineCardPending: boolean;
  isPlaceCardPending: boolean;
  isSkipTrackPending: boolean;
  isSkipTurnPending: boolean;
  placeCardActionStatus: PlaceCardActionStatus;
  onTokenSpendAnimationStart?: (payload: {
    amount: number;
    originX: number;
    originY: number;
  }) => void;
  roomState: PublicRoomState;
  skipTrackActionStatus: SkipTrackActionStatus;
  skipTurnActionStatus: SkipTurnActionStatus;
}

export function TurnActionDock({
  buyTimelineCardActionStatus,
  canConfirmTurnPlacement,
  canSkipOfflinePlayer,
  canUseBuyCard,
  canUseSkipTrack,
  handleBuyTimelineCardWithTt,
  handlePlaceCard,
  handleSkipOfflinePlayer,
  handleSkipTrackWithTt,
  isBuyTimelineCardPending,
  isPlaceCardPending,
  isSkipTrackPending,
  isSkipTurnPending,
  placeCardActionStatus,
  onTokenSpendAnimationStart,
  roomState,
  skipTrackActionStatus,
  skipTurnActionStatus,
}: TurnActionDockProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();
  const skipCostBadgeRef = useRef<HTMLSpanElement | null>(null);
  const buyCostBadgeRef = useRef<HTMLSpanElement | null>(null);
  const offlinePlayerId =
    roomState.status === "challenge"
      ? roomState.challengeState?.challengerPlayerId
      : roomState.turn?.activePlayerId;
  const offlinePlayerName = canSkipOfflinePlayer
    ? (roomState.players.find((p) => p.id === offlinePlayerId)?.displayName ??
      t("game.player.unknown"))
    : null;
  const turnSkipCountdown = useTurnSkipCountdown(
    canSkipOfflinePlayer ? (roomState.turn?.turnSkipDeadlineEpochMs ?? null) : null,
  );
  let placeCardButtonLabel = t("game.controls.confirm");
  if (placeCardActionStatus === "pending") {
    placeCardButtonLabel = t("game.controls.placementPending");
  } else if (placeCardActionStatus === "retrying") {
    placeCardButtonLabel = t("game.controls.placementRetrying");
  } else if (placeCardActionStatus === "failed") {
    placeCardButtonLabel = t("game.controls.retryPlacement");
  }
  let buyTimelineCardButtonLabel = t("game.controls.buy");
  if (buyTimelineCardActionStatus === "pending") {
    buyTimelineCardButtonLabel = t("game.controls.buyPending");
  } else if (buyTimelineCardActionStatus === "retrying") {
    buyTimelineCardButtonLabel = t("game.controls.buyRetrying");
  } else if (buyTimelineCardActionStatus === "failed") {
    buyTimelineCardButtonLabel = t("game.controls.retryBuy");
  }
  let skipTrackButtonLabel = t("game.controls.skip");
  if (skipTrackActionStatus === "pending") {
    skipTrackButtonLabel = t("game.controls.skipPending");
  } else if (skipTrackActionStatus === "retrying") {
    skipTrackButtonLabel = t("game.controls.skipRetrying");
  } else if (skipTrackActionStatus === "failed") {
    skipTrackButtonLabel = t("game.controls.retrySkip");
  }
  let skipTurnButtonLabel = t("game.controls.skipTurn");
  if (skipTurnActionStatus === "retrying") {
    skipTurnButtonLabel = t("game.controls.skipTurnRetrying");
  } else if (skipTurnActionStatus === "failed") {
    skipTurnButtonLabel = t("game.controls.retrySkipTurn");
  }

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

  const isChallengePhasSkip = roomState.status === "challenge" && canSkipOfflinePlayer;
  if (roomState.status !== "turn" && !isChallengePhasSkip) {
    return null;
  }
  if (roomState.status === "turn" && !canUseSkipTrack && !canUseBuyCard && !canConfirmTurnPlacement && !canSkipOfflinePlayer) {
    return null;
  }
  const hasTurnSecondaryActions = canUseSkipTrack || canUseBuyCard;
  const useStackedTurnActions =
    roomState.status === "turn" && canConfirmTurnPlacement && hasTurnSecondaryActions;

  return (
    <>
      {canSkipOfflinePlayer && offlinePlayerName ? (
        <div className={styles.offlinePlayerPanel}>
          <div className={styles.offlinePlayerInfo}>
            <span className={styles.offlinePlayerLabel}>
              {t("game.controls.waitingFor")}
            </span>
            <span className={styles.offlinePlayerName}>{offlinePlayerName}</span>
            <span className={styles.offlinePlayerStatus}>{t("gameMenu.offline")}</span>
          </div>
          {turnSkipCountdown ? (
            <span className={styles.offlinePlayerCountdown}>
              {t("game.controls.autoSkipIn", { time: turnSkipCountdown })}
            </span>
          ) : null}
        </div>
      ) : null}
      <ActionDock className={useStackedTurnActions ? styles.floatingActionDockStacked : ""}>
        {useStackedTurnActions ? (
          <>
            <div className={styles.floatingActionSecondaryRow}>
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
                      disabled={isSkipTrackPending}
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
                      {skipTrackButtonLabel}
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
                    disabled={isBuyTimelineCardPending}
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
                    {buyTimelineCardButtonLabel}
                  </SecondaryActionButton>
                </motion.span>
              ) : null}
            </div>
            <motion.span
              className={`${styles.actionButtonMotionWrap} ${styles.actionButtonMotionWrapFull}`}
              layout="position"
              transition={createLayoutTransition(reduceMotion)}
            >
              <PrimaryActionButton
                disabled={isPlaceCardPending}
                onClick={() => handlePlaceCard()}
              >
                {placeCardButtonLabel}
              </PrimaryActionButton>
            </motion.span>
          </>
        ) : (
          <>
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
                    disabled={isSkipTrackPending}
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
                    {skipTrackButtonLabel}
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
                  disabled={isBuyTimelineCardPending}
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
                  {buyTimelineCardButtonLabel}
                </SecondaryActionButton>
              </motion.span>
            ) : null}
            {canConfirmTurnPlacement ? (
              <motion.span
                className={styles.actionButtonMotionWrap}
                layout="position"
                transition={createLayoutTransition(reduceMotion)}
              >
                <PrimaryActionButton
                  disabled={isPlaceCardPending}
                  onClick={() => handlePlaceCard()}
                >
                  {placeCardButtonLabel}
                </PrimaryActionButton>
              </motion.span>
            ) : null}
            {canSkipOfflinePlayer ? (
              <motion.span
                className={styles.actionButtonMotionWrap}
                layout="position"
                transition={createLayoutTransition(reduceMotion)}
              >
                <SecondaryActionButton
                  disabled={isSkipTurnPending}
                  onClick={() => handleSkipOfflinePlayer()}
                >
                  {skipTurnButtonLabel}
                </SecondaryActionButton>
              </motion.span>
            ) : null}
          </>
        )}
      </ActionDock>
    </>
  );
}
