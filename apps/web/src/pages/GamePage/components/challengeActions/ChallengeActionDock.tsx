import { CHALLENGE_TT_COST } from "@tunetrack/shared/client";
import { useRef } from "react";
import { useI18n } from "../../../../features/i18n";
import type {
  ClaimChallengeActionStatus,
  PlaceChallengeActionStatus,
  ResolveChallengeWindowActionStatus,
} from "../../GamePage.types";
import { ActionDock, PrimaryActionButton, SecondaryActionButton } from "../ActionDock";
import { getTokenSpendOrigin, type TokenSpendAnimationStart } from "../tokenSpendOrigin";

const CLAIM_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.beat",
  pending: "game.controls.challengeClaimPending",
  retrying: "game.controls.challengeClaimRetrying",
  failed: "game.controls.retryChallengeClaim",
} as const;

const PLACE_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.confirmBeat",
  pending: "game.controls.challengePlacementPending",
  retrying: "game.controls.challengePlacementRetrying",
  failed: "game.controls.retryChallengePlacement",
} as const;

const RESOLVE_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.resolve",
  pending: "game.controls.resolve",
  retrying: "game.controls.challengeResolutionRetrying",
  failed: "game.controls.retryChallengeResolution",
} as const;

interface ChallengeActionAvailability {
  canClaimChallenge: boolean;
  canConfirmBeatPlacement: boolean;
  canResolveChallengeWindow: boolean;
  isOpenChallengeWindow: boolean;
}

/** An open window offers Beat! and Resolve; a claimed one only the challenger's confirm. */
export function hasChallengeActions({
  canClaimChallenge,
  canConfirmBeatPlacement,
  canResolveChallengeWindow,
  isOpenChallengeWindow,
}: ChallengeActionAvailability) {
  return isOpenChallengeWindow
    ? canClaimChallenge || canResolveChallengeWindow
    : canConfirmBeatPlacement;
}

interface ChallengeActionDockProps extends ChallengeActionAvailability {
  className: string | undefined;
  claimChallengeActionStatus: ClaimChallengeActionStatus;
  claimButtonRef: (element: HTMLButtonElement | null) => void;
  handleClaimChallenge: () => void;
  handlePlaceChallenge: () => void;
  handleResolveChallengeWindow: () => void;
  isClaimChallengePending: boolean;
  isPlaceChallengePending: boolean;
  isResolveChallengeWindowPending: boolean;
  onTokenSpendAnimationStart?: TokenSpendAnimationStart | undefined;
  placeChallengeActionStatus: PlaceChallengeActionStatus;
  resolveChallengeWindowActionStatus: ResolveChallengeWindowActionStatus;
}

export function ChallengeActionDock({
  className,
  claimButtonRef,
  claimChallengeActionStatus,
  handleClaimChallenge,
  handlePlaceChallenge,
  handleResolveChallengeWindow,
  isClaimChallengePending,
  isPlaceChallengePending,
  isResolveChallengeWindowPending,
  onTokenSpendAnimationStart,
  placeChallengeActionStatus,
  resolveChallengeWindowActionStatus,
  ...availability
}: ChallengeActionDockProps) {
  const { t } = useI18n();
  const beatCostBadgeRef = useRef<HTMLSpanElement | null>(null);
  const { canClaimChallenge, canResolveChallengeWindow, isOpenChallengeWindow } = availability;

  if (!hasChallengeActions(availability)) return null;

  if (!isOpenChallengeWindow) {
    return (
      <ActionDock className={className}>
        <PrimaryActionButton disabled={isPlaceChallengePending} onClick={handlePlaceChallenge}>
          {t(PLACE_LABEL_KEY_BY_STATUS[placeChallengeActionStatus])}
        </PrimaryActionButton>
      </ActionDock>
    );
  }

  return (
    <ActionDock className={className}>
      {canClaimChallenge ? (
        <PrimaryActionButton
          buttonRef={claimButtonRef}
          disabled={isClaimChallengePending}
          onClick={(event) => {
            onTokenSpendAnimationStart?.({
              amount: -CHALLENGE_TT_COST,
              ...getTokenSpendOrigin(beatCostBadgeRef.current, event.currentTarget),
            });
            handleClaimChallenge();
          }}
          ttCost={CHALLENGE_TT_COST}
          ttCostBadgeRef={beatCostBadgeRef}
        >
          {t(CLAIM_LABEL_KEY_BY_STATUS[claimChallengeActionStatus])}
        </PrimaryActionButton>
      ) : null}
      {canResolveChallengeWindow ? (
        <SecondaryActionButton
          disabled={isResolveChallengeWindowPending}
          onClick={handleResolveChallengeWindow}
        >
          {t(RESOLVE_LABEL_KEY_BY_STATUS[resolveChallengeWindowActionStatus])}
        </SecondaryActionButton>
      ) : null}
    </ActionDock>
  );
}
