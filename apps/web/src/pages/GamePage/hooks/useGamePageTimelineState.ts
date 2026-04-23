import { useMemo } from "react";
import type { PublicRoomState } from "@tunetrack/shared";
import type { GamePageCard, GamePagePlayerNameResolver } from "../GamePage.types";
import { useGamePageActiveTimelinePreviewState } from "./useGamePageActiveTimelinePreviewState";
import { useGamePageRevealTimelineState } from "./useGamePageRevealTimelineState";

interface UseGamePageTimelineStateOptions {
  activePlayerId: string | null | undefined;
  activePlayerTtCount: number;
  activeTimelineHint: string;
  canSelectChallengeSlot: boolean;
  canSelectTurnSlot: boolean;
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  currentPlayerTimeline: PublicRoomState["timelines"][string];
  activePlayerTimeline: PublicRoomState["timelines"][string];
  getPossessivePlayerName: GamePagePlayerNameResolver;
  isViewingOwnTimeline: boolean;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
}

interface UseGamePageTimelineStateResult {
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
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

export function useGamePageTimelineState({
  activePlayerId,
  activePlayerTtCount,
  activeTimelineHint,
  canSelectChallengeSlot,
  canSelectTurnSlot,
  currentPlayerId,
  currentPlayerTtCount,
  currentPlayerTimeline,
  activePlayerTimeline,
  getPossessivePlayerName,
  isViewingOwnTimeline,
  locallyPlacedCard,
  roomState,
  selectedSlotIndex,
}: UseGamePageTimelineStateOptions): UseGamePageTimelineStateResult {
  const {
    activeTimelineChallengeSlot,
    activeTimelineOriginalSlot,
    activeTimelinePreviewCard,
    activeTimelinePreviewSlot,
  } = useGamePageActiveTimelinePreviewState({
    canSelectChallengeSlot,
    canSelectTurnSlot,
    locallyPlacedCard,
    roomState,
    selectedSlotIndex,
  });

  const {
    ownTimelineChallengeAwardSlot,
    ownTimelineOriginalAwardSlot,
    revealPreviewCard,
    revealPreviewSlot,
    showCorrectionPreview,
    showCorrectPlacementPreview,
  } = useGamePageRevealTimelineState({
    currentPlayerId,
    roomState,
  });

  const visibleTimelineCards = useMemo(
    () => (isViewingOwnTimeline ? currentPlayerTimeline : activePlayerTimeline),
    [activePlayerTimeline, currentPlayerTimeline, isViewingOwnTimeline],
  );

  function getVisibleTimelineTitle(): string {
    return isViewingOwnTimeline
      ? "Your timeline"
      : `${getPossessivePlayerName(activePlayerId)} timeline`;
  }

  function getVisibleTimelineHint(): string {
    return isViewingOwnTimeline
      ? "This is your personal timeline. Switch back to the active timeline any time."
      : activeTimelineHint;
  }

  function getVisiblePreviewCard(): PublicRoomState["currentTrackCard"] | null {
    if (isViewingOwnTimeline) {
      return null;
    }

    return revealPreviewCard ?? activeTimelinePreviewCard;
  }

  function getVisiblePreviewSlot(): number | null {
    if (isViewingOwnTimeline) {
      return null;
    }

    return revealPreviewSlot ?? activeTimelinePreviewSlot;
  }

  return {
    showCorrectPlacementPreview,
    showCorrectionPreview,
    visibleChallengeChosenSlot: isViewingOwnTimeline
      ? ownTimelineChallengeAwardSlot
      : activeTimelineChallengeSlot,
    visibleOriginalChosenSlot: isViewingOwnTimeline
      ? ownTimelineOriginalAwardSlot
      : activeTimelineOriginalSlot,
    visiblePreviewCard: getVisiblePreviewCard(),
    visiblePreviewSlot: getVisiblePreviewSlot(),
    visibleTimelineCardCount: visibleTimelineCards.length,
    visibleTimelineCards,
    visibleTimelineHint: getVisibleTimelineHint(),
    visibleTimelineTtCount: isViewingOwnTimeline
      ? currentPlayerTtCount
      : activePlayerTtCount,
    visibleTimelineTitle: getVisibleTimelineTitle(),
  };
}
