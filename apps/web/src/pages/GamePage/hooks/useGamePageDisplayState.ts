import type { PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
} from "../GamePage.types";
import { useGamePageChallengeCelebrationState } from "./useGamePageChallengeCelebrationState";
import { useGamePageStatusState } from "./useGamePageStatusState";
import { useGamePageTimelineState } from "./useGamePageTimelineState";

interface UseGamePageDisplayStateOptions {
  activePlayerId: string | null | undefined;
  activePlayerTimeline: PublicRoomState["timelines"][string];
  canSelectChallengeSlot: boolean;
  canSelectTurnSlot: boolean;
  challengeOwnerId: string | null | undefined;
  currentPlayerId: string | null;
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
  visibleTimelineTitle: string;
}

export function useGamePageDisplayState({
  activePlayerId,
  activePlayerTimeline,
  canSelectChallengeSlot,
  canSelectTurnSlot,
  challengeOwnerId,
  currentPlayerId,
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
  const {
    challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey,
  } = useGamePageChallengeCelebrationState({
    currentPlayerId,
    roomState,
  });

  const statusState = useGamePageStatusState({
    activePlayerId,
    challengeOwnerId,
    currentPlayerId,
    canSelectChallengeSlot,
    challengeSuccessCelebrationCard,
    getPlayerName,
    getPossessivePlayerName,
    isCurrentPlayerTurn,
    nowEpochMs,
    roomState,
  });

  const timelineState = useGamePageTimelineState({
    activePlayerId,
    activePlayerTimeline,
    activeTimelineHint: statusState.activeTimelineHint,
    canSelectChallengeSlot,
    canSelectTurnSlot,
    currentPlayerId,
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
    challengeSuccessCelebrationCard,
    challengeSuccessCelebrationKey,
    challengeSuccessMessage: statusState.challengeSuccessMessage,
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
    visibleTimelineTitle: timelineState.visibleTimelineTitle,
  };
}
