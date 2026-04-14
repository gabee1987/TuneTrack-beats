import type { PublicRoomState } from "@tunetrack/shared";
import {
  getGamePageActiveTimelinePreviewState,
  type GamePageActiveTimelinePreviewSelectorResult,
} from "../gamePageTimelineSelectors";

interface UseGamePageActiveTimelinePreviewStateOptions {
  canSelectChallengeSlot: boolean;
  canSelectTurnSlot: boolean;
  locallyPlacedCard: PublicRoomState["currentTrackCard"] | null;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
}

export function useGamePageActiveTimelinePreviewState({
  canSelectChallengeSlot,
  canSelectTurnSlot,
  locallyPlacedCard,
  roomState,
  selectedSlotIndex,
}: UseGamePageActiveTimelinePreviewStateOptions): GamePageActiveTimelinePreviewSelectorResult {
  return getGamePageActiveTimelinePreviewState({
    canSelectChallengeSlot,
    canSelectTurnSlot,
    locallyPlacedCard,
    roomState,
    selectedSlotIndex,
  });
}
