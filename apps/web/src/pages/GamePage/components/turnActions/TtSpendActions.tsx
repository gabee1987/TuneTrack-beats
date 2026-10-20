import { BUY_TIMELINE_CARD_TT_COST, SKIP_TRACK_TT_COST } from "@tunetrack/shared/client";
import { useRef } from "react";
import { useI18n } from "../../../../features/i18n";
import { MotionPresence } from "../../../../features/motion";
import type { BuyTimelineCardActionStatus, SkipTrackActionStatus } from "../../GamePage.types";
import { SecondaryActionButton } from "../ActionDock";
import { getTokenSpendOrigin, type TokenSpendAnimationStart } from "../tokenSpendOrigin";
import { TurnActionSlot } from "./TurnActionSlot";

const SKIP_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.skip",
  pending: "game.controls.skipPending",
  retrying: "game.controls.skipRetrying",
  failed: "game.controls.retrySkip",
} as const;

const BUY_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.buy",
  pending: "game.controls.buyPending",
  retrying: "game.controls.buyRetrying",
  failed: "game.controls.retryBuy",
} as const;

interface TtSpendButtonProps {
  isPending: boolean;
  label: string;
  onSpend: () => void;
  onTokenSpendAnimationStart?: TokenSpendAnimationStart | undefined;
  ttCost: number;
}

function TtSpendButton({
  isPending,
  label,
  onSpend,
  onTokenSpendAnimationStart,
  ttCost,
}: TtSpendButtonProps) {
  const costBadgeRef = useRef<HTMLSpanElement | null>(null);

  return (
    <SecondaryActionButton
      disabled={isPending}
      onClick={(event) => {
        onTokenSpendAnimationStart?.({
          amount: -ttCost,
          ...getTokenSpendOrigin(costBadgeRef.current, event.currentTarget),
        });
        onSpend();
      }}
      ttCost={ttCost}
      ttCostBadgeRef={costBadgeRef}
    >
      {label}
    </SecondaryActionButton>
  );
}

interface SkipTrackActionProps {
  actionStatus: SkipTrackActionStatus;
  handleSkipTrackWithTt: () => void;
  isAvailable: boolean;
  isPending: boolean;
  onTokenSpendAnimationStart?: TokenSpendAnimationStart | undefined;
}

/** Leaves with an exit animation once the turn's one skip has been used. */
export function SkipTrackAction({
  actionStatus,
  handleSkipTrackWithTt,
  isAvailable,
  isPending,
  onTokenSpendAnimationStart,
}: SkipTrackActionProps) {
  const { t } = useI18n();

  return (
    <MotionPresence mode="popLayout">
      {isAvailable ? (
        <TurnActionSlot hasExitMotion key="skip-track">
          <TtSpendButton
            isPending={isPending}
            label={t(SKIP_LABEL_KEY_BY_STATUS[actionStatus])}
            onSpend={handleSkipTrackWithTt}
            onTokenSpendAnimationStart={onTokenSpendAnimationStart}
            ttCost={SKIP_TRACK_TT_COST}
          />
        </TurnActionSlot>
      ) : null}
    </MotionPresence>
  );
}

interface BuyCardActionProps {
  actionStatus: BuyTimelineCardActionStatus;
  handleBuyTimelineCardWithTt: () => void;
  isPending: boolean;
  onTokenSpendAnimationStart?: TokenSpendAnimationStart | undefined;
}

export function BuyCardAction({
  actionStatus,
  handleBuyTimelineCardWithTt,
  isPending,
  onTokenSpendAnimationStart,
}: BuyCardActionProps) {
  const { t } = useI18n();

  return (
    <TurnActionSlot>
      <TtSpendButton
        isPending={isPending}
        label={t(BUY_LABEL_KEY_BY_STATUS[actionStatus])}
        onSpend={handleBuyTimelineCardWithTt}
        onTokenSpendAnimationStart={onTokenSpendAnimationStart}
        ttCost={BUY_TIMELINE_CARD_TT_COST}
      />
    </TurnActionSlot>
  );
}
