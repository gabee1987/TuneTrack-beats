import type { GamePageCard, TimelineCelebrationTone } from "./GamePage.types";
import {
  createSkipTrackPreviewCardTransitionEvent,
  createTimelineCelebrationTransitionEvent,
  createTimelinePreviewTransitionEvent,
  type PreviewCardTransitionEvent,
  type TimelineCelebrationTransitionEvent,
  type TimelinePreviewTransitionEvent,
} from "./gamePageTransitionEvents";

interface DetectSkipTrackPreviewTransitionEventOptions {
  currentTrackId: string | null;
  eventKey: number;
  pendingSkippedTrackId: string | null;
  roomStatus: string | null;
}

interface DetectTimelineCelebrationTransitionEventOptions {
  celebrationCard: GamePageCard | null;
  celebrationKey: string | null;
  celebrationMessage: string | null;
  celebrationTone: TimelineCelebrationTone;
  eventKey: number;
  shouldAnimateCardToMine: boolean;
}

interface DetectTimelinePreviewTransitionEventOptions {
  eventKey: number;
  previewCard: GamePageCard | null;
  previewSlot: number | null;
  revealPreviewKey: string | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
}

export function detectSkipTrackPreviewTransitionEvent({
  currentTrackId,
  eventKey,
  pendingSkippedTrackId,
  roomStatus,
}: DetectSkipTrackPreviewTransitionEventOptions): PreviewCardTransitionEvent | null {
  if (!pendingSkippedTrackId || roomStatus !== "turn") {
    return null;
  }

  if (!currentTrackId || currentTrackId === pendingSkippedTrackId) {
    return null;
  }

  return createSkipTrackPreviewCardTransitionEvent(
    eventKey,
    pendingSkippedTrackId,
    currentTrackId,
  );
}

export function detectTimelineCelebrationTransitionEvent({
  celebrationCard,
  celebrationKey,
  celebrationMessage,
  celebrationTone,
  eventKey,
  shouldAnimateCardToMine,
}: DetectTimelineCelebrationTransitionEventOptions): TimelineCelebrationTransitionEvent | null {
  if (!celebrationKey || !celebrationMessage) {
    return null;
  }

  return createTimelineCelebrationTransitionEvent({
    celebrationCard,
    celebrationKey,
    eventKey,
    message: celebrationMessage,
    shouldAnimateCardToMine,
    tone: celebrationTone,
  });
}

export function detectTimelinePreviewTransitionEvent({
  eventKey,
  previewCard,
  previewSlot,
  revealPreviewKey,
  showCorrectPlacementPreview,
  showCorrectionPreview,
}: DetectTimelinePreviewTransitionEventOptions): TimelinePreviewTransitionEvent | null {
  if (
    !revealPreviewKey ||
    !previewCard ||
    previewSlot === null ||
    (!showCorrectPlacementPreview && !showCorrectionPreview)
  ) {
    return null;
  }

  return createTimelinePreviewTransitionEvent({
    eventKey,
    previewCard,
    previewSlot,
    reason: showCorrectionPreview
      ? "reveal_correction_preview"
      : "reveal_correct_preview",
    showCorrectPlacementPreview,
    showCorrectionPreview,
    showRevealedContent: showCorrectionPreview,
  });
}
