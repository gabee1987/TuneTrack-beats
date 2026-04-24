import type { GamePageCard, TimelineView } from "../GamePage.types";
import type { TimelineCelebrationTransitionEvent } from "../gamePageTransitionEvents";

export interface TimelineFlyAnimationState {
  card: GamePageCard;
  sourceRect: DOMRect;
  targetRect: DOMRect;
}

interface CreateTimelineCelebrationFlyAnimationStateOptions {
  mineButtonRect: DOMRect | null;
  previewCardRect: DOMRect | null;
  timelineView: TimelineView;
  transitionEvent: TimelineCelebrationTransitionEvent;
}

export function shouldHandleTimelineCelebrationEvent(
  lastHandledEventKey: number | null,
  transitionEvent: TimelineCelebrationTransitionEvent | null,
): transitionEvent is TimelineCelebrationTransitionEvent {
  return Boolean(
    transitionEvent && transitionEvent.eventKey !== lastHandledEventKey,
  );
}

export function createTimelineCelebrationFlyAnimationState({
  mineButtonRect,
  previewCardRect,
  timelineView,
  transitionEvent,
}: CreateTimelineCelebrationFlyAnimationStateOptions): TimelineFlyAnimationState | null {
  if (
    !transitionEvent.celebrationCard ||
    !transitionEvent.shouldAnimateCardToMine ||
    timelineView === "mine" ||
    !previewCardRect ||
    !mineButtonRect
  ) {
    return null;
  }

  return {
    card: transitionEvent.celebrationCard,
    sourceRect: previewCardRect,
    targetRect: mineButtonRect,
  };
}
