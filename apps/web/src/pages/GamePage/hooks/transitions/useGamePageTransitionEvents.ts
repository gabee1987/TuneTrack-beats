import { useEffect, useRef, useState } from "react";
import type { PublicRoomState } from "@tunetrack/shared";
import type {
  GamePageCard,
  TimelineCelebrationTone,
  UseGamePageControllerResult,
} from "../../GamePage.types";
import {
  detectSkipTrackPreviewTransitionEvent,
  detectTimelineCelebrationTransitionEvent,
  detectTimelinePreviewTransitionEvent,
} from "../../gamePageTransitionEventDetectors";

interface UseGamePageTransitionEventsOptions {
  celebrationCard: GamePageCard | null;
  celebrationKey: string | null;
  celebrationMessage: string | null;
  celebrationTone: TimelineCelebrationTone;
  currentTrackId: string | null;
  pendingSkippedTrackId: string | null;
  previewCard: GamePageCard | null;
  previewSlot: number | null;
  revealPreviewTransitionKey: string | null;
  roomStatus: PublicRoomState["status"] | null;
  showCorrectPlacementPreview: boolean;
  showCorrectionPreview: boolean;
  shouldAnimateCelebrationCardToMine: boolean;
  onSkipTrackTransitionDetected: () => void;
}

interface UseGamePageTransitionEventsResult {
  previewCardTransitionEvent: UseGamePageControllerResult["previewCardTransitionEvent"];
  timelinePreviewTransitionEvent: UseGamePageControllerResult["timelinePreviewTransitionEvent"];
  timelineCelebrationTransitionEvent: UseGamePageControllerResult["timelineCelebrationTransitionEvent"];
}

export function useGamePageTransitionEvents({
  celebrationCard,
  celebrationKey,
  celebrationMessage,
  celebrationTone,
  currentTrackId,
  pendingSkippedTrackId,
  previewCard,
  previewSlot,
  revealPreviewTransitionKey,
  roomStatus,
  showCorrectPlacementPreview,
  showCorrectionPreview,
  shouldAnimateCelebrationCardToMine,
  onSkipTrackTransitionDetected,
}: UseGamePageTransitionEventsOptions): UseGamePageTransitionEventsResult {
  const [previewCardTransitionEvent, setPreviewCardTransitionEvent] = useState<
    UseGamePageControllerResult["previewCardTransitionEvent"]
  >(null);
  const [
    timelinePreviewTransitionEvent,
    setTimelinePreviewTransitionEvent,
  ] = useState<UseGamePageControllerResult["timelinePreviewTransitionEvent"]>(
    null,
  );
  const [
    timelineCelebrationTransitionEvent,
    setTimelineCelebrationTransitionEvent,
  ] = useState<UseGamePageControllerResult["timelineCelebrationTransitionEvent"]>(
    null,
  );
  const previewCardTransitionEventKeyRef = useRef(0);
  const timelinePreviewEventKeyRef = useRef(0);
  const timelineCelebrationEventKeyRef = useRef(0);
  const lastRevealPreviewKeyRef = useRef<string | null>(null);
  const lastCelebrationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const nextEvent = detectSkipTrackPreviewTransitionEvent({
      currentTrackId,
      eventKey: previewCardTransitionEventKeyRef.current + 1,
      pendingSkippedTrackId,
      roomStatus,
    });

    if (!nextEvent) {
      return;
    }

    previewCardTransitionEventKeyRef.current = nextEvent.eventKey;
    setPreviewCardTransitionEvent(nextEvent);
    onSkipTrackTransitionDetected();
  }, [
    currentTrackId,
    onSkipTrackTransitionDetected,
    pendingSkippedTrackId,
    roomStatus,
  ]);

  useEffect(() => {
    if (
      !revealPreviewTransitionKey ||
      lastRevealPreviewKeyRef.current === revealPreviewTransitionKey
    ) {
      return;
    }

    const nextEvent = detectTimelinePreviewTransitionEvent({
      eventKey: timelinePreviewEventKeyRef.current + 1,
      previewCard,
      previewSlot,
      revealPreviewKey: revealPreviewTransitionKey,
      showCorrectPlacementPreview,
      showCorrectionPreview,
    });

    if (!nextEvent) {
      return;
    }

    lastRevealPreviewKeyRef.current = revealPreviewTransitionKey;
    timelinePreviewEventKeyRef.current = nextEvent.eventKey;
    setTimelinePreviewTransitionEvent(nextEvent);
  }, [
    previewCard,
    previewSlot,
    revealPreviewTransitionKey,
    showCorrectPlacementPreview,
    showCorrectionPreview,
  ]);

  useEffect(() => {
    if (
      !celebrationKey ||
      !celebrationMessage ||
      lastCelebrationKeyRef.current === celebrationKey
    ) {
      return;
    }

    lastCelebrationKeyRef.current = celebrationKey;
    const nextEvent = detectTimelineCelebrationTransitionEvent({
      celebrationCard,
      celebrationKey,
      celebrationMessage,
      celebrationTone,
      eventKey: timelineCelebrationEventKeyRef.current + 1,
      shouldAnimateCardToMine: shouldAnimateCelebrationCardToMine,
    });

    if (!nextEvent) {
      return;
    }

    timelineCelebrationEventKeyRef.current = nextEvent.eventKey;
    setTimelineCelebrationTransitionEvent(nextEvent);
  }, [
    celebrationCard,
    celebrationKey,
    celebrationMessage,
    celebrationTone,
    shouldAnimateCelebrationCardToMine,
  ]);

  return {
    previewCardTransitionEvent,
    timelinePreviewTransitionEvent,
    timelineCelebrationTransitionEvent,
  };
}
