import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared/client";
import { type MutableRefObject, useCallback } from "react";
import { emitAction, type EmitActionResult } from "../../../../services/socket/emitAction";
import { useAckedAction } from "./useAckedAction";

interface UseChallengeActionsOptions {
  canClaimChallenge: boolean | null | undefined;
  canResolveChallengeWindow: boolean | null | undefined;
  canSelectChallengeSlot: boolean | null | undefined;
  reportActionResult: (result: EmitActionResult) => void;
  roomStateRef: MutableRefObject<PublicRoomState | null>;
  selectedSlotIndexRef: MutableRefObject<number>;
}

export function useChallengeActions({
  canClaimChallenge,
  canResolveChallengeWindow,
  canSelectChallengeSlot,
  reportActionResult,
  roomStateRef,
  selectedSlotIndexRef,
}: UseChallengeActionsOptions) {
  const claimChallenge = useAckedAction(reportActionResult);
  const placeChallenge = useAckedAction(reportActionResult);
  const resolveChallengeWindow = useAckedAction(reportActionResult);
  const submitClaimChallenge = claimChallenge.submit;
  const submitPlaceChallenge = placeChallenge.submit;
  const submitResolveChallengeWindow = resolveChallengeWindow.submit;

  const handleClaimChallenge = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || !canClaimChallenge) return;

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    await submitClaimChallenge({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.ClaimChallenge,
          { roomId: roomState.roomId },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.status === "challenge" &&
          currentRoomState.challengeState?.phase === "open" &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          currentRoomState.currentTrackCard?.id === submittedCardId
        );
      },
    });
  }, [canClaimChallenge, roomStateRef, submitClaimChallenge]);

  const handlePlaceChallenge = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || !canSelectChallengeSlot) return;

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    const submittedChallengerId = roomState.challengeState?.challengerPlayerId;
    await submitPlaceChallenge({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.PlaceChallenge,
          { roomId: roomState.roomId, selectedSlotIndex: selectedSlotIndexRef.current },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.status === "challenge" &&
          currentRoomState.challengeState?.phase === "claimed" &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          currentRoomState.currentTrackCard?.id === submittedCardId &&
          currentRoomState.challengeState.challengerPlayerId === submittedChallengerId
        );
      },
    });
  }, [canSelectChallengeSlot, roomStateRef, selectedSlotIndexRef, submitPlaceChallenge]);

  const handleResolveChallengeWindow = useCallback(() => {
    const roomState = roomStateRef.current;
    if (!roomState || !canResolveChallengeWindow) return;

    const submittedRoomId = roomState.roomId;
    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    void submitResolveChallengeWindow({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.ResolveChallengeWindow,
          { roomId: submittedRoomId },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.status === "challenge" &&
          currentRoomState.challengeState?.phase === "open" &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          currentRoomState.currentTrackCard?.id === submittedCardId
        );
      },
    });
  }, [canResolveChallengeWindow, roomStateRef, submitResolveChallengeWindow]);

  return {
    claimChallengeActionStatus: claimChallenge.status,
    handleClaimChallenge,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    isClaimChallengePending: claimChallenge.isPending,
    isPlaceChallengePending: placeChallenge.isPending,
    isResolveChallengeWindowPending: resolveChallengeWindow.isPending,
    placeChallengeActionStatus: placeChallenge.status,
    resolveChallengeWindowActionStatus: resolveChallengeWindow.status,
  };
}
