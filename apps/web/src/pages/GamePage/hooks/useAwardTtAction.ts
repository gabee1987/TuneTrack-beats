import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction, type EmitActionResult } from "../../../services/socket/emitAction";
import type { AwardTtActionState } from "../GamePage.types";

interface UseAwardTtActionOptions {
  reportActionResult: (result: EmitActionResult) => void;
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useAwardTtAction({
  currentPlayerId,
  roomState,
  reportActionResult,
}: UseAwardTtActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionState, setActionState] = useState<AwardTtActionState | null>(null);

  const submitAdjustment = useCallback(
    (playerId: string, amount: 1 | -1) => {
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        !roomState.settings.ttModeEnabled ||
        isPendingRef.current
      ) {
        return false;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      const submittedTokenCount = roomState.players.find(
        (player) => player.id === playerId,
      )?.ttTokenCount;
      function isSubmittedAdjustmentCurrent() {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.hostId === submittedHostId &&
          currentRoomState.players.find((player) => player.id === playerId)?.ttTokenCount ===
            submittedTokenCount
        );
      }

      isPendingRef.current = true;
      setActionState({ amount, playerId, status: "pending" });
      void (async () => {
        try {
          const result = await emitAction(
            ClientToServerEvent.AwardTt,
            { roomId: submittedRoomId, playerId, amount },
            {
              onTimeoutRetry: () => {
                if (isSubmittedAdjustmentCurrent()) {
                  setActionState({ amount, playerId, status: "retrying" });
                }
              },
              retryOnTimeout: true,
            },
          );
          reportActionResult(result);
          setActionState(
            result.status === "timeout" && isSubmittedAdjustmentCurrent()
              ? { amount, playerId, status: "failed" }
              : null,
          );
        } catch {
          setActionState(
            isSubmittedAdjustmentCurrent() ? { amount, playerId, status: "failed" } : null,
          );
        } finally {
          isPendingRef.current = false;
        }
      })();

      return true;
    },
    [currentPlayerId, roomState],
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
    actionState,
    handleAwardTt,
    handleRemoveTt,
    isPending: actionState?.status === "pending" || actionState?.status === "retrying",
  };
}
