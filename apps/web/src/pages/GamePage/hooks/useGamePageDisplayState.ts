import type { PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
  TimelineCelebrationTone,
} from "../GamePage.types";
import { useGamePageStatusState } from "./useGamePageStatusState";
import { useGamePageTimelineState } from "./useGamePageTimelineState";

interface UseGamePageDisplayStateOptions {
  activePlayerId: string | null | undefined;
  activePlayerTtCount: number;
  activePlayerTimeline: PublicRoomState["timelines"][string];
  canSelectChallengeSlot: boolean;
  canSelectTurnSlot: boolean;
  challengeOwnerId: string | null | undefined;
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  currentPlayerTimeline: PublicRoomState["timelines"][string];
  getPlayerName: GamePagePlayerNameResolver;
  getPossessivePlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  isViewingOwnTimeline: boolean;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
}

interface UseGamePageDisplayStateResult {
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  challengeSuccessCelebrationCard: GamePageCard | null;
  challengeSuccessCelebrationKey: string | null;
  challengeSuccessMessage: string | null;
  challengeSuccessTone: TimelineCelebrationTone;
  shouldAnimateCelebrationCardToMine: boolean;
  disabledTimelineSlots: number[];
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  statusBadgeText: string;
  statusDetailText: string;
  visibleChallengeChosenSlot: number | null;
  visibleOriginalChosenSlot: number | null;
  visiblePreviewCard: GamePageCard | null;
  visiblePreviewSlot: number | null;
  visibleTimelineCardCount: number;
  visibleTimelineCards: PublicRoomState["timelines"][string];
  visibleTimelineHint: string;
  visibleTimelineTtCount: number;
  visibleTimelineTitle: string;
}

export function useGamePageDisplayState({
  activePlayerId,
  activePlayerTtCount,
  activePlayerTimeline,
  canSelectChallengeSlot,
  canSelectTurnSlot,
  challengeOwnerId,
  currentPlayerId,
  currentPlayerTtCount,
  currentPlayerTimeline,
  getPlayerName,
  getPossessivePlayerName,
  isCurrentPlayerTurn,
  isViewingOwnTimeline,
  locallyPlacedCard,
  nowEpochMs,
  roomState,
  selectedSlotIndex,
}: UseGamePageDisplayStateOptions): UseGamePageDisplayStateResult {
  const revealOutcomeCard =
    roomState?.status === "reveal" && roomState.revealState?.revealType === "placement"
      ? roomState.revealState.placedCard
      : null;
  const revealOutcomeKey =
    revealOutcomeCard && roomState?.revealState
      ? [
          roomState.roomId,
          roomState.turn?.turnNumber ?? "reveal",
          roomState.revealState.playerId,
          roomState.revealState.placedCard.id,
          roomState.revealState.selectedSlotIndex,
          roomState.revealState.challengerPlayerId ?? "placement",
          roomState.revealState.challengeWasSuccessful === null
            ? roomState.revealState.wasCorrect
              ? "correct"
              : "wrong"
            : roomState.revealState.challengeWasSuccessful
              ? "challenge-success"
              : "challenge-failure",
        ].join(":")
      : null;
  const revealOutcomeTone: TimelineCelebrationTone =
    roomState?.revealState?.challengeWasSuccessful === false ||
    (roomState?.revealState?.challengeWasSuccessful === null &&
      roomState.revealState.wasCorrect === false)
      ? "failure"
      : "success";
  const revealOutcomeMessage =
    roomState?.status !== "reveal" || !roomState.revealState
      ? null
      : roomState.revealState.challengeWasSuccessful === true
        ? "Challenge won."
        : roomState.revealState.challengeWasSuccessful === false
          ? "Challenge failed."
          : roomState.revealState.wasCorrect
            ? "Correct placement."
            : "Wrong placement.";
  const shouldAnimateCelebrationCardToMine =
    roomState?.status === "reveal" &&
    roomState.revealState?.challengeWasSuccessful === true &&
    roomState.revealState.challengerPlayerId === currentPlayerId;

  const statusState = useGamePageStatusState({
    activePlayerId,
    challengeOwnerId,
    currentPlayerId,
    canSelectChallengeSlot,
    challengeSuccessCelebrationCard: revealOutcomeCard,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn,
    nowEpochMs,
    roomState,
  });

  const timelineState = useGamePageTimelineState({
    activePlayerId,
    activePlayerTtCount,
    activePlayerTimeline,
    activeTimelineHint: statusState.activeTimelineHint,
    canSelectChallengeSlot,
    canSelectTurnSlot,
    currentPlayerId,
    currentPlayerTtCount,
    currentPlayerTimeline,
    getPossessivePlayerName,
    isViewingOwnTimeline,
    locallyPlacedCard,
    roomState,
    selectedSlotIndex,
  });

  return {
    challengeActionBody: statusState.challengeActionBody,
    challengeActionTitle: statusState.challengeActionTitle,
    challengeCountdownLabel: statusState.challengeCountdownLabel,
    challengeMarkerTone: statusState.challengeMarkerTone,
    challengeSuccessCelebrationCard: revealOutcomeCard,
    challengeSuccessCelebrationKey: revealOutcomeKey,
    challengeSuccessMessage: revealOutcomeMessage ?? statusState.challengeSuccessMessage,
    challengeSuccessTone: revealOutcomeTone,
    shouldAnimateCelebrationCardToMine,
    disabledTimelineSlots: [],
    showCorrectPlacementPreview: timelineState.showCorrectPlacementPreview,
    showCorrectionPreview: timelineState.showCorrectionPreview,
    statusBadgeText: statusState.statusBadgeText,
    statusDetailText: statusState.statusDetailText,
    visibleChallengeChosenSlot: timelineState.visibleChallengeChosenSlot,
    visibleOriginalChosenSlot: timelineState.visibleOriginalChosenSlot,
    visiblePreviewCard: timelineState.visiblePreviewCard,
    visiblePreviewSlot: timelineState.visiblePreviewSlot,
    visibleTimelineCardCount: timelineState.visibleTimelineCardCount,
    visibleTimelineCards: timelineState.visibleTimelineCards,
    visibleTimelineHint: timelineState.visibleTimelineHint,
    visibleTimelineTtCount: timelineState.visibleTimelineTtCount,
    visibleTimelineTitle: timelineState.visibleTimelineTitle,
  };
}
