import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { ResolveChallengeWindowActionStatus } from "../GamePage.types";

interface UseResolveChallengeWindowActionOptions {
  canResolveChallengeWindow: boolean | null | undefined;
  roomState: PublicRoomState | null;
}

export function useResolveChallengeWindowAction({
  canResolveChallengeWindow,
  roomState,
}: UseResolveChallengeWindowActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionStatus, setActionStatus] =
    useState<ResolveChallengeWindowActionStatus>("idle");

  const handleResolveChallengeWindow = useCallback(() => {
    if (!roomState || !canResolveChallengeWindow || isPendingRef.current) {
      return;
    }

    const submittedRoomId = roomState.roomId;
    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    function isSubmittedChallengeWindowCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.roomId === submittedRoomId &&
        currentRoomState.status === "challenge" &&
        currentRoomState.challengeState?.phase === "open" &&
        currentRoomState.turn?.turnNumber === submittedTurnNumber &&
        currentRoomState.currentTrackCard?.id === submittedCardId
      );
    }

    isPendingRef.current = true;
    setActionStatus("pending");
    void (async () => {
      try {
        const result = await emitAction(
          ClientToServerEvent.ResolveChallengeWindow,
          { roomId: submittedRoomId },
          {
            onTimeoutRetry: () => {
              if (isSubmittedChallengeWindowCurrent()) {
                setActionStatus("retrying");
              }
            },
            retryOnTimeout: true,
          },
        );
        setActionStatus(
          result.status === "timeout" && isSubmittedChallengeWindowCurrent()
            ? "failed"
            : "idle",
        );
      } catch {
        setActionStatus(isSubmittedChallengeWindowCurrent() ? "failed" : "idle");
      } finally {
        isPendingRef.current = false;
      }
    })();
  }, [canResolveChallengeWindow, roomState]);

  return {
    actionStatus,
    handleResolveChallengeWindow,
    isPending: actionStatus === "pending" || actionStatus === "retrying",
  };
}
