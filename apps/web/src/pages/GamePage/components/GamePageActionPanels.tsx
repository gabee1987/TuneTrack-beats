import type { PublicRoomState } from "@tunetrack/shared";
import type {
  GamePageController,
  GamePageControllerExtras,
} from "../GamePage.types";
import { ChallengeActionPanel } from "./ChallengeActionPanel";
import { FinishedStatePanel } from "./FinishedStatePanel";
import { RevealActionDock } from "./RevealActionDock";
import { TurnActionDock } from "./TurnActionDock";

interface GamePageActionPanelsProps
  extends Pick<
    GamePageController & GamePageControllerExtras,
    | "canClaimChallenge"
    | "canConfirmBeatPlacement"
    | "canConfirmReveal"
    | "canConfirmTurnPlacement"
    | "canResolveChallengeWindow"
    | "canUseBuyCard"
    | "canUseSkipTrack"
    | "challengeActionBody"
    | "challengeActionTitle"
    | "challengeCountdownLabel"
    | "currentPlayerTtCount"
    | "getPlayerName"
    | "handleBuyTimelineCardWithTt"
    | "handleClaimChallenge"
    | "handleConfirmReveal"
    | "handlePlaceCard"
    | "handlePlaceChallenge"
    | "handleResolveChallengeWindow"
    | "handleSkipTrackWithTt"
    | "showHelperLabels"
  > {
  roomState: PublicRoomState;
}

export function GamePageActionPanels({
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
}: GamePageActionPanelsProps) {
  return (
    <>
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
