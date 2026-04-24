import { useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  createPreviewCardReplaceEnterInitial,
  createPreviewCardReplaceEnterMotion,
  createPreviewCardReplaceExitMotion,
} from "../../../../features/motion";
import type { GamePageCard } from "../../GamePage.types";
import type { PreviewCardTransitionEvent } from "../../gamePageTransitionEvents";

interface UsePreviewCardTransitionOptions {
  previewCard: GamePageCard | null;
  showRevealedContent: boolean;
  transitionEvent: PreviewCardTransitionEvent | null;
}

interface UsePreviewCardTransitionResult {
  animationControls: ReturnType<typeof useAnimationControls>;
  displayCard: GamePageCard | null;
  displayShowRevealedContent: boolean;
  isTransitionActive: boolean;
}

export function usePreviewCardTransition({
  previewCard,
  showRevealedContent,
  transitionEvent,
}: UsePreviewCardTransitionOptions): UsePreviewCardTransitionResult {
  const reduceMotion = useReducedMotion() ?? false;
  const animationControls = useAnimationControls();
  const [displayCard, setDisplayCard] = useState<GamePageCard | null>(previewCard);
  const [displayShowRevealedContent, setDisplayShowRevealedContent] =
    useState(showRevealedContent);
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const lastHandledTransitionKeyRef = useRef<number | null>(
    transitionEvent?.eventKey ?? null,
  );

  useEffect(() => {
    if (isTransitionActive) {
      return;
    }

    setDisplayCard(previewCard);
    setDisplayShowRevealedContent(showRevealedContent);
    animationControls.set({
      opacity: 1,
      scale: 1,
    });
  }, [
    animationControls,
    isTransitionActive,
    previewCard,
    showRevealedContent,
  ]);

  useEffect(() => {
    if (!transitionEvent || !previewCard) {
      return;
    }

    if (transitionEvent.eventKey === lastHandledTransitionKeyRef.current) {
      return;
    }

    lastHandledTransitionKeyRef.current = transitionEvent.eventKey;
    let isCancelled = false;
    setIsTransitionActive(true);

    const nextCard = previewCard;
    const nextShowRevealedContent = showRevealedContent;

    const runTransition = async () => {
      await animationControls.start(
        createPreviewCardReplaceExitMotion(reduceMotion),
      );

      if (isCancelled) {
        return;
      }

      setDisplayCard(nextCard);
      setDisplayShowRevealedContent(nextShowRevealedContent);
      animationControls.set(
        createPreviewCardReplaceEnterInitial(reduceMotion),
      );

      if (isCancelled) {
        return;
      }

      await animationControls.start(
        createPreviewCardReplaceEnterMotion(reduceMotion),
      );

      if (isCancelled) {
        return;
      }

      setIsTransitionActive(false);
    };

    void runTransition();

    return () => {
      isCancelled = true;
    };
  }, [
    animationControls,
    previewCard,
    reduceMotion,
    showRevealedContent,
    transitionEvent,
  ]);

  return {
    animationControls,
    displayCard,
    displayShowRevealedContent,
    isTransitionActive,
  };
}
