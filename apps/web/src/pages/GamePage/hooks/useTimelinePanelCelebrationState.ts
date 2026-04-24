import { useEffect, useRef, useState } from "react";
import { timelineCelebrationTransitionContract } from "../../../features/motion";
import type { TimelineView } from "../GamePage.types";
import type { TimelineCelebrationTransitionEvent } from "../gamePageTransitionEvents";
import {
  createTimelineCelebrationFlyAnimationState,
  shouldHandleTimelineCelebrationEvent,
  type TimelineFlyAnimationState,
} from "./timelinePanelCelebrationState.utils";

interface UseTimelinePanelCelebrationStateOptions {
  timelineView: TimelineView;
  transitionEvent: TimelineCelebrationTransitionEvent | null;
}

export function useTimelinePanelCelebrationState({
  timelineView,
  transitionEvent,
}: UseTimelinePanelCelebrationStateOptions) {
  const [activeCelebrationEvent, setActiveCelebrationEvent] =
    useState<TimelineCelebrationTransitionEvent | null>(null);
  const [flyAnimationState, setFlyAnimationState] =
    useState<TimelineFlyAnimationState | null>(null);
  const previewCardRectRef = useRef<DOMRect | null>(null);
  const lastHandledEventKeyRef = useRef<number | null>(
    transitionEvent?.eventKey ?? null,
  );
  const mineButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!shouldHandleTimelineCelebrationEvent(
      lastHandledEventKeyRef.current,
      transitionEvent,
    )) {
      return;
    }

    lastHandledEventKeyRef.current = transitionEvent.eventKey;
    setActiveCelebrationEvent(transitionEvent);
    setFlyAnimationState(
      createTimelineCelebrationFlyAnimationState({
        mineButtonRect: mineButtonRef.current?.getBoundingClientRect() ?? null,
        previewCardRect: previewCardRectRef.current,
        timelineView,
        transitionEvent,
      }),
    );
  }, [timelineView, transitionEvent]);

  useEffect(() => {
    if (!activeCelebrationEvent) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveCelebrationEvent(null);
    }, timelineCelebrationTransitionContract.toastVisibilityMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeCelebrationEvent]);

  useEffect(() => {
    if (!flyAnimationState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlyAnimationState(null);
    }, timelineCelebrationTransitionContract.flyAnimationCleanupMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [flyAnimationState]);

  return {
    activeCelebrationEvent,
    flyAnimationState,
    mineButtonRef,
    previewCardRectRef,
  };
}
