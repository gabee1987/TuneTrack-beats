import type { PublicRoomState } from "@tunetrack/shared";
import {
  getGamePageRevealTimelineState,
  type GamePageRevealTimelineSelectorResult,
} from "../gamePageTimelineSelectors";

interface UseGamePageRevealTimelineStateOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useGamePageRevealTimelineState({
  currentPlayerId,
  roomState,
}: UseGamePageRevealTimelineStateOptions): GamePageRevealTimelineSelectorResult {
  return getGamePageRevealTimelineState({
    currentPlayerId,
    roomState,
  });
}
