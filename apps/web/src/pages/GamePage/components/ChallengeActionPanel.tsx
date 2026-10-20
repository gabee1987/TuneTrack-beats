import { useState } from "react";
import { FirstRunHint } from "../../../features/hints/FirstRunHint";
import { useIsPagePresent } from "../../../features/motion";
import { LayerPortal } from "../../../features/overlay";
import { useMobileControlPortalTarget } from "../../../features/viewport/useMobileControlPortalTarget";
import type {
  ClaimChallengeActionStatus,
  GamePageChallengePhase,
  PlaceChallengeActionStatus,
  ResolveChallengeWindowActionStatus,
} from "../GamePage.types";
import { ChallengeActionDock, hasChallengeActions } from "./challengeActions/ChallengeActionDock";
import { ChallengeCallout } from "./challengeActions/ChallengeCallout";
import styles from "./gamePageActionPanelsChallenge.module.css";
import type { TokenSpendAnimationStart } from "./tokenSpendOrigin";

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
  onTokenSpendAnimationStart?: TokenSpendAnimationStart;
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
  currentPlayerTtCount,
  isCurrentPlayerTurn,
  ttModeEnabled,
  ...dockProps
}: ChallengeActionPanelProps) {
  const portalTarget = useMobileControlPortalTarget();
  const isPresent = useIsPagePresent();
  const [challengeHintAnchor, setChallengeHintAnchor] = useState<HTMLElement | null>(null);
  const availability = {
    canClaimChallenge,
    canConfirmBeatPlacement,
    canResolveChallengeWindow,
    isOpenChallengeWindow: challengePhase === "open",
  };

  // Portaled into `document.body`, this outlives the page's exit transform exactly as the
  // action dock does — see the note in `ActionDock`.
  if (portalTarget && !isPresent) {
    return null;
  }

  const challengeCallout = (
    <ChallengeCallout
      canResolveChallengeWindow={canResolveChallengeWindow}
      challengeActionBody={challengeActionBody}
      challengeActionTitle={challengeActionTitle}
      challengeDeadlineEpochMs={challengeDeadlineEpochMs}
      challengePhase={challengePhase}
      currentPlayerTtCount={currentPlayerTtCount}
      isCurrentPlayerTurn={isCurrentPlayerTurn}
      ttModeEnabled={ttModeEnabled}
    />
  );
  const actionDock = (
    <ChallengeActionDock
      {...dockProps}
      {...availability}
      claimButtonRef={setChallengeHintAnchor}
      className={portalTarget ? "" : styles.floatingActionDockInChallengeStack}
    />
  );
  const challengeHint = (
    <FirstRunHint anchor={challengeHintAnchor} id="game-challenge" isEligible={canClaimChallenge} />
  );

  if (portalTarget) {
    return (
      <>
        <LayerPortal>{challengeCallout}</LayerPortal>
        {challengePhase ? actionDock : null}
        {challengeHint}
      </>
    );
  }

  return hasChallengeActions(availability) ? (
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
