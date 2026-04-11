import { useEffect, useState } from "react";
import type { PublicRoomState } from "@tunetrack/shared";
import type { TimelineView } from "../GamePage.types";

interface UseGamePageLocalUiStateOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useGamePageLocalUiState({
  currentPlayerId,
  roomState,
}: UseGamePageLocalUiStateOptions) {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [locallyPlacedCard, setLocallyPlacedCard] = useState<
    PublicRoomState["currentTrackCard"] | null
  >(null);
  const [timelineView, setTimelineView] = useState<TimelineView>("active");

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

    if (roomState?.turn?.activePlayerId === currentPlayerId) {
      setTimelineView("active");
    }
  }, [currentPlayerId, roomState?.turn?.activePlayerId]);

  useEffect(() => {
    if (roomState?.status === "turn") {
      setLocallyPlacedCard(null);
    }
  }, [roomState?.status, roomState?.turn?.turnNumber]);

  useEffect(() => {
    if (!roomState) {
      return;
    }

    setSelectedSlotIndex(0);
  }, [roomState]);

  return {
    locallyPlacedCard,
    selectedSlotIndex,
    setLocallyPlacedCard,
    setSelectedSlotIndex,
    setTimelineView,
    timelineView,
  };
}
