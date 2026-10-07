import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared/client";
import { useCallback, useRef, useState } from "react";
import { emitAction, type EmitActionResult } from "../../../services/socket/emitAction";
import type { SkipTurnActionStatus } from "../GamePage.types";

interface UseSkipTurnActionOptions {
  reportActionResult: (result: EmitActionResult) => void;
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useSkipTurnAction({
  currentPlayerId,
  roomState,
  reportActionResult,
}: UseSkipTurnActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionStatus, setActionStatus] = useState<SkipTurnActionStatus>("idle");

  const handleSkipTurn = useCallback(() => {
    const roomState = roomStateRef.current;
    const isClaimedChallenge =
      roomState?.status === "challenge" && roomState.challengeState?.phase === "claimed";
    if (
      !roomState ||
      roomState.hostId !== currentPlayerId ||
      (roomState.status !== "turn" && !isClaimedChallenge) ||
      isPendingRef.current
    ) {
      return;
    }

    const submittedRoomId = roomState.roomId;
    const submittedStatus = roomState.status;
    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedPlayerId = isClaimedChallenge
      ? roomState.challengeState?.challengerPlayerId
      : roomState.turn?.activePlayerId;
    function isSubmittedTurnCurrent() {
      const currentRoomState = roomStateRef.current;
      const currentPlayerId =
        submittedStatus === "challenge"
          ? currentRoomState?.challengeState?.challengerPlayerId
          : currentRoomState?.turn?.activePlayerId;
      return (
        currentRoomState?.roomId === submittedRoomId &&
        currentRoomState.status === submittedStatus &&
        currentRoomState.turn?.turnNumber === submittedTurnNumber &&
        currentPlayerId === submittedPlayerId
      );
    }

    isPendingRef.current = true;
    setActionStatus("pending");
    void (async () => {
      try {
        const result = await emitAction(
          ClientToServerEvent.SkipTurn,
          { roomId: submittedRoomId },
          {
            onTimeoutRetry: () => {
              if (isSubmittedTurnCurrent()) {
                setActionStatus("retrying");
              }
            },
            retryOnTimeout: true,
          },
        );
        reportActionResult(result);
        setActionStatus(
          result.status === "timeout" && isSubmittedTurnCurrent() ? "failed" : "idle",
        );
      } catch {
        setActionStatus(isSubmittedTurnCurrent() ? "failed" : "idle");
      } finally {
        isPendingRef.current = false;
      }
    })();
  }, [currentPlayerId, reportActionResult]);

  return {
    actionStatus,
    handleSkipTurn,
    isPending: actionStatus === "pending" || actionStatus === "retrying",
  };
}
