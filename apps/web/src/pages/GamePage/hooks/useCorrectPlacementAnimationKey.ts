import { useEffect, useRef, useState } from "react";
import { timelineCelebrationTransitionContract } from "../../../features/motion";
import type { GamePageCard } from "../GamePage.types";

interface UseCorrectPlacementAnimationKeyOptions {
  isShowingCorrectPlacement: boolean;
  originalChosenSlotIndex: number | null;
  timelineCards: GamePageCard[];
}

/**
 * Whether the correctly placed card should play its hero glow now: once per placement, for the
 * glow's duration. Returns false again once it has played.
 */
export function useCorrectPlacementAnimationKey({
  isShowingCorrectPlacement,
  originalChosenSlotIndex,
  timelineCards,
}: UseCorrectPlacementAnimationKeyOptions): boolean {
  const lastAnimationKeyRef = useRef<string | null>(null);
  const [activeAnimationKey, setActiveAnimationKey] = useState<string | null>(null);
  const correctPlacementCard =
    isShowingCorrectPlacement && originalChosenSlotIndex !== null
      ? (timelineCards[originalChosenSlotIndex] ?? null)
      : null;
  // Derived from this render's own reveal, never from the toast celebration event: that
  // event only exists for revealType "placement" and sits in state indefinitely once one
  // has fired, so reading it here meant a tt_buy reveal either reused a stale, unrelated key
  // (glowing the wrong card, or the right card under the wrong identity) or found nothing
  // and skipped its own glow — and either way left the ref primed with a value the next
  // genuine placement could collide with if it followed quickly.
  const animationKey = correctPlacementCard
    ? [
        "correct-placement",
        originalChosenSlotIndex,
        correctPlacementCard.id,
        "revealedYear" in correctPlacementCard
          ? correctPlacementCard.revealedYear
          : correctPlacementCard.releaseYear,
      ].join(":")
    : null;

  useEffect(() => {
    if (animationKey === null || lastAnimationKeyRef.current === animationKey) {
      return;
    }

    lastAnimationKeyRef.current = animationKey;
    setActiveAnimationKey(animationKey);

    const timeoutId = window.setTimeout(
      () => {
        setActiveAnimationKey((currentKey) => (currentKey === animationKey ? null : currentKey));
      },
      timelineCelebrationTransitionContract.correctPlacementHeroDurationSeconds * 1000 + 250,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [animationKey]);

  return animationKey !== null && activeAnimationKey === animationKey;
}
