import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared/client";
import { type MutableRefObject, useCallback } from "react";
import { emitAction, type EmitActionResult } from "../../../../services/socket/emitAction";
import type { AwardTtActionState } from "../../GamePage.types";
import { useAckedAction, useTargetedActionState } from "./useAckedAction";

interface UseTtActionsOptions {
  currentPlayerId: string | null;
  isCurrentPlayerTurn: boolean;
  onSkipTrackWithTtIntent?: ((cardId: string | null) => void) | undefined;
  reportActionResult: (result: EmitActionResult) => void;
  roomStateRef: MutableRefObject<PublicRoomState | null>;
}

function canSpendTtOnTurn(roomState: PublicRoomState, isCurrentPlayerTurn: boolean) {
  return roomState.settings.ttModeEnabled && roomState.status === "turn" && isCurrentPlayerTurn;
}

export function useTtActions({
  currentPlayerId,
  isCurrentPlayerTurn,
  onSkipTrackWithTtIntent,
  reportActionResult,
  roomStateRef,
}: UseTtActionsOptions) {
  const skipTrack = useAckedAction(reportActionResult);
  const buyTimelineCard = useAckedAction(reportActionResult);
  const awardTt =
    useAckedAction<Pick<AwardTtActionState, "amount" | "playerId">>(reportActionResult);
  const submitSkipTrack = skipTrack.submit;
  const submitBuyTimelineCard = buyTimelineCard.submit;
  const submitAwardTt = awardTt.submit;

  const handleSkipTrackWithTt = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || !canSpendTtOnTurn(roomState, isCurrentPlayerTurn)) return;

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    await submitSkipTrack({
      target: null,
      emit: (onTimeoutRetry) => {
        onSkipTrackWithTtIntent?.(submittedCardId ?? null);
        return emitAction(
          ClientToServerEvent.SkipTrackWithTt,
          { roomId: roomState.roomId },
          { onTimeoutRetry, retryOnTimeout: true },
        );
      },
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.status === "turn" &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          currentRoomState.currentTrackCard?.id === submittedCardId
        );
      },
      onSettled: (result, isSubmissionCurrent) => {
        if (isSubmissionCurrent && result?.status !== "ok") onSkipTrackWithTtIntent?.(null);
      },
    });
  }, [isCurrentPlayerTurn, onSkipTrackWithTtIntent, roomStateRef, submitSkipTrack]);

  const handleBuyTimelineCardWithTt = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || !canSpendTtOnTurn(roomState, isCurrentPlayerTurn)) return;

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    await submitBuyTimelineCard({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.BuyTimelineCardWithTt,
          { roomId: roomState.roomId },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.status === "turn" &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          currentRoomState.currentTrackCard?.id === submittedCardId
        );
      },
    });
  }, [isCurrentPlayerTurn, roomStateRef, submitBuyTimelineCard]);

  const submitAdjustment = useCallback(
    (playerId: string, amount: 1 | -1) => {
      const roomState = roomStateRef.current;
      if (!roomState || roomState.hostId !== currentPlayerId || !roomState.settings.ttModeEnabled) {
        return false;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      const findTokenCount = (state: PublicRoomState | null) =>
        state?.players.find((player) => player.id === playerId)?.ttTokenCount;
      const submittedTokenCount = findTokenCount(roomState);
      const submission = submitAwardTt({
        target: { amount, playerId },
        emit: (onTimeoutRetry) =>
          emitAction(
            ClientToServerEvent.AwardTt,
            { roomId: submittedRoomId, playerId, amount },
            { onTimeoutRetry, retryOnTimeout: true },
          ),
        isSubmissionCurrent: () => {
          const currentRoomState = roomStateRef.current;
          return (
            currentRoomState?.roomId === submittedRoomId &&
            currentRoomState.hostId === submittedHostId &&
            findTokenCount(currentRoomState) === submittedTokenCount
          );
        },
      });
      return submission !== null;
    },
    [currentPlayerId, roomStateRef, submitAwardTt],
  );

  const handleAwardTt = useCallback(
    (playerId: string) => submitAdjustment(playerId, 1),
    [submitAdjustment],
  );
  const handleRemoveTt = useCallback(
    (playerId: string) => submitAdjustment(playerId, -1),
    [submitAdjustment],
  );

  return {
    awardTtActionState: useTargetedActionState(awardTt),
    buyTimelineCardActionStatus: buyTimelineCard.status,
    handleAwardTt,
    handleBuyTimelineCardWithTt,
    handleRemoveTt,
    handleSkipTrackWithTt,
    isAwardTtPending: awardTt.isPending,
    isBuyTimelineCardPending: buyTimelineCard.isPending,
    isSkipTrackPending: skipTrack.isPending,
    skipTrackActionStatus: skipTrack.status,
  };
}
