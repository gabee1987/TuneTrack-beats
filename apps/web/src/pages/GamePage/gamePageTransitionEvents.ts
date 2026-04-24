import type { GamePageCard } from "./GamePage.types";

export type PreviewCardTransitionReason = "skip_track_replace";
export type TimelineCelebrationTransitionReason = "challenge_success_celebration";
export type TimelinePreviewTransitionReason =
  | "reveal_correct_preview"
  | "reveal_correction_preview";

export interface PreviewCardTransitionEvent {
  eventKey: number;
  nextCardId: string;
  previousCardId: string;
  reason: PreviewCardTransitionReason;
}

export interface TimelineCelebrationTransitionEvent {
  celebrationCard: GamePageCard | null;
  eventKey: number;
  celebrationKey: string;
  message: string;
  reason: TimelineCelebrationTransitionReason;
  shouldAnimateCardToMine: boolean;
  tone: "success" | "failure";
}

export interface TimelinePreviewTransitionEvent {
  eventKey: number;
  previewCard: GamePageCard;
  previewSlot: number;
  reason: TimelinePreviewTransitionReason;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showRevealedContent: boolean;
}

export function createSkipTrackPreviewCardTransitionEvent(
  eventKey: number,
  previousCardId: string,
  nextCardId: string,
): PreviewCardTransitionEvent {
  return {
    eventKey,
    nextCardId,
    previousCardId,
    reason: "skip_track_replace",
  };
}

export function createTimelineCelebrationTransitionEvent(options: {
  celebrationCard: GamePageCard | null;
  celebrationKey: string;
  eventKey: number;
  message: string;
  shouldAnimateCardToMine: boolean;
  tone: "success" | "failure";
}): TimelineCelebrationTransitionEvent {
  return {
    celebrationCard: options.celebrationCard,
    celebrationKey: options.celebrationKey,
    eventKey: options.eventKey,
    message: options.message,
    reason: "challenge_success_celebration",
    shouldAnimateCardToMine: options.shouldAnimateCardToMine,
    tone: options.tone,
  };
}

export function createTimelinePreviewTransitionEvent(options: {
  eventKey: number;
  previewCard: GamePageCard;
  previewSlot: number;
  reason: TimelinePreviewTransitionReason;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  showRevealedContent: boolean;
}): TimelinePreviewTransitionEvent {
  return {
    eventKey: options.eventKey,
    previewCard: options.previewCard,
    previewSlot: options.previewSlot,
    reason: options.reason,
    showCorrectPlacementPreview: options.showCorrectPlacementPreview,
    showCorrectionPreview: options.showCorrectionPreview,
    showRevealedContent: options.showRevealedContent,
  };
}
