import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared/client";
import { type MutableRefObject, useCallback } from "react";
import { emitAction, type EmitActionResult } from "../../../../services/socket/emitAction";
import { useAckedAction, useTargetedActionState } from "./useAckedAction";

interface UseRoomActionsOptions {
  currentPlayerId: string | null;
  reportActionResult: (result: EmitActionResult) => void;
  roomStateRef: MutableRefObject<PublicRoomState | null>;
}

interface PlayerTarget {
  playerId: string;
}

function findPlayer(roomState: PublicRoomState | null, playerId: string) {
  return roomState?.players.find((player) => player.id === playerId);
}

/** Host-only room moderation: close the room, skip the active turn, hand over or kick. */
export function useRoomActions({
  currentPlayerId,
  reportActionResult,
  roomStateRef,
}: UseRoomActionsOptions) {
  const closeRoom = useAckedAction(reportActionResult);
  const skipTurn = useAckedAction(reportActionResult);
  const transferHost = useAckedAction<PlayerTarget>(reportActionResult);
  const kickPlayer = useAckedAction<PlayerTarget>(reportActionResult);
  const submitCloseRoom = closeRoom.submit;
  const submitSkipTurn = skipTurn.submit;
  const submitTransferHost = transferHost.submit;
  const submitKickPlayer = kickPlayer.submit;

  const handleCloseRoom = useCallback(async () => {
    const roomState = roomStateRef.current;
    if (!roomState || roomState.hostId !== currentPlayerId) return;

    const submittedRoomId = roomState.roomId;
    const submittedHostId = roomState.hostId;
    await submitCloseRoom({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.CloseRoom,
          { roomId: submittedRoomId },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.hostId === submittedHostId
        );
      },
    });
  }, [currentPlayerId, roomStateRef, submitCloseRoom]);

  const handleSkipTurn = useCallback(() => {
    const roomState = roomStateRef.current;
    const isClaimedChallenge =
      roomState?.status === "challenge" && roomState.challengeState?.phase === "claimed";
    if (
      !roomState ||
      roomState.hostId !== currentPlayerId ||
      (roomState.status !== "turn" && !isClaimedChallenge)
    ) {
      return;
    }

    const submittedRoomId = roomState.roomId;
    const submittedStatus = roomState.status;
    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedPlayerId = isClaimedChallenge
      ? roomState.challengeState?.challengerPlayerId
      : roomState.turn?.activePlayerId;
    void submitSkipTurn({
      target: null,
      emit: (onTimeoutRetry) =>
        emitAction(
          ClientToServerEvent.SkipTurn,
          { roomId: submittedRoomId },
          { onTimeoutRetry, retryOnTimeout: true },
        ),
      isSubmissionCurrent: () => {
        const currentRoomState = roomStateRef.current;
        const skippedPlayerId =
          submittedStatus === "challenge"
            ? currentRoomState?.challengeState?.challengerPlayerId
            : currentRoomState?.turn?.activePlayerId;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.status === submittedStatus &&
          currentRoomState.turn?.turnNumber === submittedTurnNumber &&
          skippedPlayerId === submittedPlayerId
        );
      },
    });
  }, [currentPlayerId, roomStateRef, submitSkipTurn]);

  const handleTransferHost = useCallback(
    (playerId: string) => {
      const roomState = roomStateRef.current;
      const targetPlayer = findPlayer(roomState, playerId);
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        playerId === currentPlayerId ||
        !targetPlayer ||
        targetPlayer.connectionStatus === "disconnected"
      ) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      void submitTransferHost({
        target: { playerId },
        emit: (onTimeoutRetry) =>
          emitAction(
            ClientToServerEvent.TransferHost,
            { roomId: submittedRoomId, playerId },
            { onTimeoutRetry, retryOnTimeout: true },
          ),
        isSubmissionCurrent: () => {
          const currentRoomState = roomStateRef.current;
          return (
            currentRoomState?.roomId === submittedRoomId &&
            currentRoomState.hostId === submittedHostId &&
            findPlayer(currentRoomState, playerId)?.connectionStatus === "connected"
          );
        },
      });
    },
    [currentPlayerId, roomStateRef, submitTransferHost],
  );

  const handleKickPlayer = useCallback(
    (playerId: string) => {
      const roomState = roomStateRef.current;
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        playerId === currentPlayerId ||
        !findPlayer(roomState, playerId)
      ) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      void submitKickPlayer({
        target: { playerId },
        emit: (onTimeoutRetry) =>
          emitAction(
            ClientToServerEvent.KickPlayer,
            { roomId: submittedRoomId, playerId },
            { onTimeoutRetry, retryOnTimeout: true },
          ),
        isSubmissionCurrent: () => {
          const currentRoomState = roomStateRef.current;
          return (
            currentRoomState?.roomId === submittedRoomId &&
            currentRoomState.hostId === submittedHostId &&
            findPlayer(currentRoomState, playerId) !== undefined
          );
        },
      });
    },
    [currentPlayerId, roomStateRef, submitKickPlayer],
  );

  return {
    closeRoomActionStatus: closeRoom.status,
    handleCloseRoom,
    handleKickPlayer,
    handleSkipTurn,
    handleTransferHost,
    isCloseRoomPending: closeRoom.isPending,
    isKickPlayerPending: kickPlayer.isPending,
    isSkipTurnPending: skipTurn.isPending,
    isTransferHostPending: transferHost.isPending,
    kickPlayerActionState: useTargetedActionState(kickPlayer),
    skipTurnActionStatus: skipTurn.status,
    transferHostActionState: useTargetedActionState(transferHost),
  };
}
