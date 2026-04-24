import { useEffect, useRef, useState } from "react";
import type { GamePageCard } from "../../GamePage.types";
import type { TimelinePreviewTransitionEvent } from "../../gamePageTransitionEvents";

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
  const [displayPreviewCard, setDisplayPreviewCard] = useState<GamePageCard | null>(
    previewCard,
  );
  const [displayPreviewSlot, setDisplayPreviewSlot] = useState<number | null>(
    previewSlot,
  );
  const [
    displayShowCorrectPlacementPreview,
    setDisplayShowCorrectPlacementPreview,
  ] = useState(showCorrectPlacementPreview);
  const [displayShowCorrectionPreview, setDisplayShowCorrectionPreview] =
    useState(showCorrectionPreview);
  const [displayShowRevealedContent, setDisplayShowRevealedContent] =
    useState(showCorrectionPreview);
  const lastHandledTransitionKeyRef = useRef<number | null>(
    transitionEvent?.eventKey ?? null,
  );

  useEffect(() => {
    setDisplayPreviewCard(previewCard);
    setDisplayPreviewSlot(previewSlot);
    setDisplayShowCorrectPlacementPreview(showCorrectPlacementPreview);
    setDisplayShowCorrectionPreview(showCorrectionPreview);
    setDisplayShowRevealedContent(showCorrectionPreview);
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
    setDisplayPreviewCard(transitionEvent.previewCard);
    setDisplayPreviewSlot(transitionEvent.previewSlot);
    setDisplayShowCorrectPlacementPreview(
      transitionEvent.showCorrectPlacementPreview,
    );
    setDisplayShowCorrectionPreview(transitionEvent.showCorrectionPreview);
    setDisplayShowRevealedContent(transitionEvent.showRevealedContent);
  }, [transitionEvent]);

  return {
    displayPreviewCard,
    displayPreviewSlot,
    displayShowCorrectPlacementPreview,
    displayShowCorrectionPreview,
    displayShowRevealedContent,
  };
}
