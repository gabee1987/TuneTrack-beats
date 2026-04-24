import type { GamePageCard } from "../../GamePage.types";
import type { TimelinePreviewTransitionEvent } from "../../gamePageTransitionEvents";

export interface TimelinePreviewDisplayState {
  displayPreviewCard: GamePageCard | null;
  displayPreviewSlot: number | null;
  displayShowCorrectPlacementPreview: boolean;
  displayShowCorrectionPreview: boolean;
  displayShowRevealedContent: boolean;
}

interface CreateTimelinePreviewDisplayStateOptions {
  previewCard: GamePageCard | null;
  previewSlot: number | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
}

export function createTimelinePreviewDisplayState({
  previewCard,
  previewSlot,
  showCorrectPlacementPreview,
  showCorrectionPreview,
}: CreateTimelinePreviewDisplayStateOptions): TimelinePreviewDisplayState {
  return {
    displayPreviewCard: previewCard,
    displayPreviewSlot: previewSlot,
    displayShowCorrectPlacementPreview: showCorrectPlacementPreview,
    displayShowCorrectionPreview: showCorrectionPreview,
    displayShowRevealedContent: showCorrectionPreview,
  };
}

export function applyTimelinePreviewTransitionEvent(
  transitionEvent: TimelinePreviewTransitionEvent,
): TimelinePreviewDisplayState {
  return {
    displayPreviewCard: transitionEvent.previewCard,
    displayPreviewSlot: transitionEvent.previewSlot,
    displayShowCorrectPlacementPreview:
      transitionEvent.showCorrectPlacementPreview,
    displayShowCorrectionPreview: transitionEvent.showCorrectionPreview,
    displayShowRevealedContent: transitionEvent.showRevealedContent,
  };
}
