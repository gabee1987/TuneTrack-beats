import type { PublicRoomState } from "@tunetrack/shared/client";
import { useCallback, useRef } from "react";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { useChallengeActions } from "./actions/useChallengeActions";
import { usePlacementActions } from "./actions/usePlacementActions";
import { useRoomActions } from "./actions/useRoomActions";
import { useTtActions } from "./actions/useTtActions";

interface UseGamePageActionsOptions {
  canClaimChallenge: boolean | null | undefined;
  canConfirmReveal: boolean | null | undefined;
  canResolveChallengeWindow: boolean | null | undefined;
  canSelectChallengeSlot: boolean | null | undefined;
  currentPlayerId: string | null;
  isCurrentPlayerTurn: boolean;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  /** Gameplay is refused, never queued, while offline; the caller tells the player so. */
  onActionOffline?: () => void;
  onSkipTrackWithTtIntent?: (cardId: string | null) => void;
  setLocallyPlacedCard: (card: PublicRoomState["currentTrackCard"] | null) => void;
}

export function useGamePageActions({
  canClaimChallenge,
  canConfirmReveal,
  canResolveChallengeWindow,
  canSelectChallengeSlot,
  currentPlayerId,
  isCurrentPlayerTurn,
  roomState,
  selectedSlotIndex,
  onActionOffline,
  onSkipTrackWithTtIntent,
  setLocallyPlacedCard,
}: UseGamePageActionsOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const selectedSlotIndexRef = useRef(selectedSlotIndex);
  selectedSlotIndexRef.current = selectedSlotIndex;
  const onActionOfflineRef = useRef(onActionOffline);
  onActionOfflineRef.current = onActionOffline;
  const reportActionResult = useCallback((result: EmitActionResult) => {
    if (result.status === "offline") onActionOfflineRef.current?.();
  }, []);

  return {
    ...usePlacementActions({
      canConfirmReveal,
      isCurrentPlayerTurn,
      reportActionResult,
      roomStateRef,
      selectedSlotIndexRef,
      setLocallyPlacedCard,
    }),
    ...useChallengeActions({
      canClaimChallenge,
      canResolveChallengeWindow,
      canSelectChallengeSlot,
      reportActionResult,
      roomStateRef,
      selectedSlotIndexRef,
    }),
    ...useTtActions({
      currentPlayerId,
      isCurrentPlayerTurn,
      onSkipTrackWithTtIntent,
      reportActionResult,
      roomStateRef,
    }),
    ...useRoomActions({ currentPlayerId, reportActionResult, roomStateRef }),
  };
}
