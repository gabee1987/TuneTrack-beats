import { useEffect, useRef, useState } from "react";
import type { GamePageCard } from "../../GamePage.types";
import type { TimelinePreviewTransitionEvent } from "../../gamePageTransitionEvents";
import {
  applyTimelinePreviewTransitionEvent,
  createTimelinePreviewDisplayState,
} from "./timelinePreviewTransitionState";

interface UseTimelinePreviewTransitionOptions {
  previewCard: GamePageCard | null;
  previewSlot: number | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  transitionEvent: TimelinePreviewTransitionEvent | null;
}

interface UseTimelinePreviewTransitionResult {
  displayPreviewCard: GamePageCard | null;
  displayPreviewSlot: number | null;
  displayShowCorrectPlacementPreview: boolean;
  displayShowCorrectionPreview: boolean;
  displayShowRevealedContent: boolean;
}

export function useTimelinePreviewTransition({
  previewCard,
  previewSlot,
  showCorrectPlacementPreview,
  showCorrectionPreview,
  transitionEvent,
}: UseTimelinePreviewTransitionOptions): UseTimelinePreviewTransitionResult {
  const [displayState, setDisplayState] = useState(() =>
    createTimelinePreviewDisplayState({
      previewCard,
      previewSlot,
      showCorrectPlacementPreview,
      showCorrectionPreview,
    }),
  );
  const lastHandledTransitionKeyRef = useRef<number | null>(
    transitionEvent?.eventKey ?? null,
  );

  useEffect(() => {
    setDisplayState(
      createTimelinePreviewDisplayState({
        previewCard,
        previewSlot,
        showCorrectPlacementPreview,
        showCorrectionPreview,
      }),
    );
  }, [
    previewCard,
    previewSlot,
    showCorrectPlacementPreview,
    showCorrectionPreview,
  ]);

  useEffect(() => {
    if (!transitionEvent) {
      return;
    }

    if (transitionEvent.eventKey === lastHandledTransitionKeyRef.current) {
      return;
    }

    lastHandledTransitionKeyRef.current = transitionEvent.eventKey;
    setDisplayState(applyTimelinePreviewTransitionEvent(transitionEvent));
  }, [transitionEvent]);

  return {
    ...displayState,
  };
}
