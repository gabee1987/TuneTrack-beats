import { useEffect, useRef, useState } from "react";
import type { GamePageCard, TimelineView } from "../GamePage.types";

interface UseTimelinePanelCelebrationStateOptions {
  celebrationCard: GamePageCard | null;
  celebrationKey: string | null;
  timelineView: TimelineView;
}

export function useTimelinePanelCelebrationState({
  celebrationCard,
  celebrationKey,
  timelineView,
}: UseTimelinePanelCelebrationStateOptions) {
  const [flyAnimationState, setFlyAnimationState] = useState<{
    card: GamePageCard;
    sourceRect: DOMRect;
    targetRect: DOMRect;
  } | null>(null);
  const [showCelebrationToast, setShowCelebrationToast] = useState(false);
  const previewCardRectRef = useRef<DOMRect | null>(null);
  const lastCelebrationKeyRef = useRef<string | null>(null);
  const mineButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!flyAnimationState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlyAnimationState(null);
    }, 850);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [flyAnimationState]);

  useEffect(() => {
    if (!showCelebrationToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCelebrationToast(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showCelebrationToast]);

  useEffect(() => {
    if (!celebrationKey || lastCelebrationKeyRef.current === celebrationKey) {
      return;
    }

    lastCelebrationKeyRef.current = celebrationKey;
    setShowCelebrationToast(true);

    if (
      !celebrationCard ||
      timelineView === "mine" ||
      !previewCardRectRef.current ||
      !mineButtonRef.current
    ) {
      return;
    }

    setFlyAnimationState({
      card: celebrationCard,
      sourceRect: previewCardRectRef.current,
      targetRect: mineButtonRef.current.getBoundingClientRect(),
    });
  }, [celebrationCard, celebrationKey, timelineView]);

  return {
    flyAnimationState,
    mineButtonRef,
    previewCardRectRef,
    setShowCelebrationToast,
    showCelebrationToast,
  };
}
