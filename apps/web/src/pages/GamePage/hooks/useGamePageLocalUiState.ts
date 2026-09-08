import { useEffect, useState } from "react";
import type { PublicRoomState } from "@tunetrack/shared";
import type { TimelineView } from "../GamePage.types";

interface UseGamePageLocalUiStateOptions {
  currentPlayerId: string | null;
  isConnected: boolean;
  roomState: PublicRoomState | null;
}

export function useGamePageLocalUiState({
  currentPlayerId,
  isConnected,
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
    if (
      roomState?.status === "challenge" &&
      roomState.challengeState?.phase === "claimed" &&
      roomState.challengeState.challengerPlayerId === currentPlayerId
    ) {
      setTimelineView("active");
    }
  }, [
    currentPlayerId,
    roomState?.challengeState?.challengerPlayerId,
    roomState?.challengeState?.phase,
    roomState?.status,
  ]);

  useEffect(() => {
    if (roomState?.status === "turn") {
      setLocallyPlacedCard(null);
    }
  }, [roomState?.status, roomState?.turn?.turnNumber]);

  /**
   * Only a reveal clears the optimistic card, and a reveal can only arrive over the
   * socket. Losing the connection while it is set would otherwise lock the board for good;
   * the server's state wins again as soon as the rejoin lands.
   */
  useEffect(() => {
    if (!isConnected) {
      setLocallyPlacedCard(null);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!roomState) {
      return;
    }

    setSelectedSlotIndex(0);
  }, [
    roomState?.status,
    roomState?.turn?.activePlayerId,
    roomState?.turn?.turnNumber,
  ]);

  return {
    locallyPlacedCard,
    selectedSlotIndex,
    setLocallyPlacedCard,
    setSelectedSlotIndex,
    setTimelineView,
    timelineView,
  };
}
