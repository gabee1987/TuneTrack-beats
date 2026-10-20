import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared/client";
import { type MutableRefObject, useCallback } from "react";
import { emitAction, type EmitActionResult } from "../../../../services/socket/emitAction";
import { useAckedAction } from "./useAckedAction";

interface UsePlacementActionsOptions {
  canConfirmReveal: boolean | null | undefined;
  isCurrentPlayerTurn: boolean;
  reportActionResult: (result: EmitActionResult) => void;
  roomStateRef: MutableRefObject<PublicRoomState | null>;
  selectedSlotIndexRef: MutableRefObject<number>;
  setLocallyPlacedCard: (card: PublicRoomState["currentTrackCard"] | null) => void;
}

const isAlwaysCurrent = () => true;

export function usePlacementActions({
  canConfirmReveal,
  isCurrentPlayerTurn,
  reportActionResult,
  roomStateRef,
  selectedSlotIndexRef,
  setLocallyPlacedCard,
}: UsePlacementActionsOptions) {
  const placeCard = useAckedAction(reportActionResult);
  const confirmReveal = useAckedAction(reportActionResult);
  const submitPlaceCard = placeCard.submit;
  const submitConfirmReveal = confirmReveal.submit;

  const handlePlaceCard = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) return;

    await submitPlaceCard({
      target: null,
      emit: (onTimeoutRetry) => {
        setLocallyPlacedCard(roomState.currentTrackCard ?? null);
        return emitAction(
          ClientToServerEvent.PlaceCard,
          { roomId: roomState.roomId, selectedSlotIndex: selectedSlotIndexRef.current },
          { onTimeoutRetry, retryOnTimeout: true },
        );
      },
      isSubmissionCurrent: isAlwaysCurrent,
      onSettled: (result) => {
        if (result?.status !== "ok") setLocallyPlacedCard(null);
      },
    });
  }, [
    isCurrentPlayerTurn,
    roomStateRef,
    selectedSlotIndexRef,
    setLocallyPlacedCard,
    submitPlaceCard,
  ]);

  const handleConfirmReveal = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || !canConfirmReveal) return;

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    await submitConfirmReveal({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.ConfirmReveal,
          { roomId: roomState.roomId },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.status === "reveal" &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          currentRoomState.currentTrackCard?.id === submittedCardId
        );
      },
    });
  }, [canConfirmReveal, roomStateRef, submitConfirmReveal]);

  return {
    confirmRevealActionStatus: confirmReveal.status,
    handleConfirmReveal,
    handlePlaceCard,
    isConfirmRevealPending: confirmReveal.isPending,
    isPlaceCardPending: placeCard.isPending,
    placeCardActionStatus: placeCard.status,
  };
}
