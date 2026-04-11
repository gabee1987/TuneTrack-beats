import { useMemo } from "react";
import type { PublicRoomState } from "@tunetrack/shared";

interface UseGamePageTimelineStateOptions {
  activePlayerId: string | null | undefined;
  activeTimelineHint: string;
  canSelectChallengeSlot: boolean;
  canSelectTurnSlot: boolean;
  currentPlayerId: string | null;
  currentPlayerTimeline: PublicRoomState["timelines"][string];
  activePlayerTimeline: PublicRoomState["timelines"][string];
  getPossessivePlayerName: (playerId: string | null | undefined) => string;
  isViewingOwnTimeline: boolean;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
}

export function useGamePageTimelineState({
  activePlayerId,
  activeTimelineHint,
  canSelectChallengeSlot,
  canSelectTurnSlot,
  currentPlayerId,
  currentPlayerTimeline,
  activePlayerTimeline,
  getPossessivePlayerName,
  isViewingOwnTimeline,
  locallyPlacedCard,
  roomState,
  selectedSlotIndex,
}: UseGamePageTimelineStateOptions) {
  function getActiveTimelineOriginalSlot(): number | null {
    if (roomState?.status === "challenge") {
      return roomState.challengeState?.originalSelectedSlotIndex ?? null;
    }

    if (roomState?.status === "reveal") {
      return roomState.revealState?.selectedSlotIndex ?? null;
    }

    return canSelectTurnSlot ? selectedSlotIndex : null;
  }

  function getActiveTimelineChallengeSlot(): number | null {
    if (roomState?.status === "challenge") {
      return canSelectChallengeSlot ? selectedSlotIndex : null;
    }

    if (roomState?.status === "reveal") {
      return roomState.revealState?.challengerSelectedSlotIndex ?? null;
    }

    return null;
  }

  function getActiveTimelinePreviewCard():
    | PublicRoomState["currentTrackCard"]
    | null {
    if (roomState?.status === "challenge") {
      return roomState.currentTrackCard ?? locallyPlacedCard;
    }

    if (canSelectTurnSlot) {
      return roomState?.currentTrackCard ?? null;
    }

    return null;
  }

  function getActiveTimelinePreviewSlot(
    originalSlot: number | null,
  ): number | null {
    if (!canSelectTurnSlot && roomState?.status !== "challenge") {
      return null;
    }

    return canSelectChallengeSlot ? selectedSlotIndex : originalSlot;
  }

  function getRevealPreviewState(): {
    previewCard: PublicRoomState["currentTrackCard"] | null;
    previewSlot: number | null;
    showCorrectionPreview: boolean;
    showCorrectPlacementPreview: boolean;
  } {
    if (
      roomState?.status !== "reveal" ||
      !roomState.revealState ||
      roomState.settings.ttModeEnabled
    ) {
      return {
        previewCard: null,
        previewSlot: null,
        showCorrectionPreview: false,
        showCorrectPlacementPreview: false,
      };
    }

    if (roomState.revealState.wasCorrect) {
      return {
        previewCard: null,
        previewSlot: null,
        showCorrectionPreview: false,
        showCorrectPlacementPreview: true,
      };
    }

    return {
      previewCard: roomState.revealState.placedCard,
      previewSlot: roomState.revealState.validSlotIndexes[0] ?? null,
      showCorrectionPreview: true,
      showCorrectPlacementPreview: false,
    };
  }

  function getOwnTimelineRevealAwardedSlot(
    awardedToChallenger: boolean,
  ): number | null {
    if (
      roomState?.status !== "reveal" ||
      roomState.revealState?.awardedPlayerId !== currentPlayerId
    ) {
      return null;
    }

    const challengerOwnsAward =
      roomState.revealState.challengerPlayerId === currentPlayerId;

    return challengerOwnsAward === awardedToChallenger
      ? roomState.revealState.awardedSlotIndex
      : null;
  }

  const activeTimelineOriginalSlot = getActiveTimelineOriginalSlot();
  const activeTimelineChallengeSlot = getActiveTimelineChallengeSlot();
  const activeTimelinePreviewCard = getActiveTimelinePreviewCard();
  const activeTimelinePreviewSlot =
    getActiveTimelinePreviewSlot(activeTimelineOriginalSlot);

  const {
    previewCard: revealPreviewCard,
    previewSlot: revealPreviewSlot,
    showCorrectionPreview,
    showCorrectPlacementPreview,
  } = getRevealPreviewState();

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
      ? getOwnTimelineRevealAwardedSlot(true)
      : activeTimelineChallengeSlot,
    visibleOriginalChosenSlot: isViewingOwnTimeline
      ? getOwnTimelineRevealAwardedSlot(false)
      : activeTimelineOriginalSlot,
    visiblePreviewCard: getVisiblePreviewCard(),
    visiblePreviewSlot: getVisiblePreviewSlot(),
    visibleTimelineCardCount: visibleTimelineCards.length,
    visibleTimelineCards,
    visibleTimelineHint: getVisibleTimelineHint(),
    visibleTimelineTitle: getVisibleTimelineTitle(),
  };
}
