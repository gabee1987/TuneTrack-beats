import type { PublicRoomState } from "@tunetrack/shared";

interface GamePageActiveTimelinePreviewSelectorOptions {
  canSelectChallengeSlot: boolean;
  canSelectTurnSlot: boolean;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
}

interface GamePageRevealTimelineSelectorOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export interface GamePageActiveTimelinePreviewSelectorResult {
  activeTimelineChallengeSlot: number | null;
  activeTimelineOriginalSlot: number | null;
  activeTimelinePreviewCard: PublicRoomState["currentTrackCard"] | null;
  activeTimelinePreviewSlot: number | null;
}

export interface GamePageRevealTimelineSelectorResult {
  ownTimelineChallengeAwardSlot: number | null;
  ownTimelineOriginalAwardSlot: number | null;
  revealPreviewCard: PublicRoomState["currentTrackCard"] | null;
  revealPreviewTransitionKey: string | null;
  revealPreviewSlot: number | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
}

export function getGamePageActiveTimelinePreviewState({
  canSelectChallengeSlot,
  canSelectTurnSlot,
  locallyPlacedCard,
  roomState,
  selectedSlotIndex,
}: GamePageActiveTimelinePreviewSelectorOptions): GamePageActiveTimelinePreviewSelectorResult {
  const activeTimelineOriginalSlot =
    roomState?.status === "challenge"
      ? roomState.challengeState?.originalSelectedSlotIndex ?? null
      : roomState?.status === "reveal"
        ? roomState.revealState?.selectedSlotIndex ?? null
        : canSelectTurnSlot
          ? selectedSlotIndex
          : null;

  const activeTimelineChallengeSlot =
    roomState?.status === "challenge"
      ? canSelectChallengeSlot
        ? selectedSlotIndex
        : null
      : roomState?.status === "reveal"
        ? roomState.revealState?.challengerSelectedSlotIndex ?? null
        : null;

  const activeTimelinePreviewCard =
    roomState?.status === "challenge"
      ? roomState.currentTrackCard ?? locallyPlacedCard
      : canSelectTurnSlot
        ? roomState?.currentTrackCard ?? null
        : null;

  const activeTimelinePreviewSlot =
    !canSelectTurnSlot && roomState?.status !== "challenge"
      ? null
      : canSelectChallengeSlot
        ? selectedSlotIndex
        : activeTimelineOriginalSlot;

  return {
    activeTimelineChallengeSlot,
    activeTimelineOriginalSlot,
    activeTimelinePreviewCard,
    activeTimelinePreviewSlot,
  };
}

export function getGamePageRevealTimelineState({
  currentPlayerId,
  roomState,
}: GamePageRevealTimelineSelectorOptions): GamePageRevealTimelineSelectorResult {
  const isRevealWithAutoCorrection =
    roomState?.status === "reveal" &&
    Boolean(roomState.revealState);

  const showCorrectPlacementPreview = Boolean(
    roomState?.status === "reveal" && roomState?.revealState?.wasCorrect,
  );

  const showCorrectionPreview = Boolean(
    isRevealWithAutoCorrection && !roomState?.revealState?.wasCorrect,
  );

  const revealPreviewCard = showCorrectionPreview
    ? roomState?.revealState?.placedCard ?? null
    : null;

  const revealPreviewSlot = showCorrectionPreview
    ? roomState?.revealState?.selectedSlotIndex ?? null
    : null;

  const revealPreviewTransitionKey =
    roomState?.status === "reveal" && roomState.revealState && revealPreviewCard
      ? [
          roomState.roomId,
          roomState.turn?.turnNumber ?? "reveal",
          roomState.revealState.playerId,
          roomState.revealState.placedCard.id,
          roomState.revealState.selectedSlotIndex,
          showCorrectionPreview ? "reveal-correction" : "reveal-correct",
        ].join(":")
      : null;

  const hasAwardedOwnTimelineSlot =
    roomState?.status === "reveal" &&
    roomState.revealState?.awardedPlayerId === currentPlayerId;

  const challengerOwnsAward =
    hasAwardedOwnTimelineSlot &&
    roomState?.revealState?.challengerPlayerId === currentPlayerId;

  return {
    ownTimelineChallengeAwardSlot:
      hasAwardedOwnTimelineSlot && challengerOwnsAward
        ? roomState?.revealState?.awardedSlotIndex ?? null
        : null,
    ownTimelineOriginalAwardSlot:
      hasAwardedOwnTimelineSlot && challengerOwnsAward === false
        ? roomState?.revealState?.awardedSlotIndex ?? null
        : null,
    revealPreviewCard,
    revealPreviewTransitionKey,
    revealPreviewSlot,
    showCorrectPlacementPreview,
    showCorrectionPreview,
  };
}
