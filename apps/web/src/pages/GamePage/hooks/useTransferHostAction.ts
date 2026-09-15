import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { TransferHostActionState } from "../GamePage.types";

interface UseTransferHostActionOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useTransferHostAction({
  currentPlayerId,
  roomState,
}: UseTransferHostActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionState, setActionState] = useState<TransferHostActionState | null>(null);

  const handleTransferHost = useCallback(
    (playerId: string) => {
      const targetPlayer = roomState?.players.find((player) => player.id === playerId);
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        playerId === currentPlayerId ||
        !targetPlayer ||
        targetPlayer.connectionStatus === "disconnected" ||
        isPendingRef.current
      ) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      function isSubmittedTransferCurrent() {
        const currentRoomState = roomStateRef.current;
        const currentTarget = currentRoomState?.players.find(
          (player) => player.id === playerId,
        );
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.hostId === submittedHostId &&
          currentTarget?.connectionStatus === "connected"
        );
      }

      isPendingRef.current = true;
      setActionState({ playerId, status: "pending" });
      void (async () => {
        try {
          const result = await emitAction(
            ClientToServerEvent.TransferHost,
            { roomId: submittedRoomId, playerId },
            {
              onTimeoutRetry: () => {
                if (isSubmittedTransferCurrent()) {
                  setActionState({ playerId, status: "retrying" });
                }
              },
              retryOnTimeout: true,
            },
          );
          setActionState(
            result.status === "timeout" && isSubmittedTransferCurrent()
              ? { playerId, status: "failed" }
              : null,
          );
        } catch {
          setActionState(
            isSubmittedTransferCurrent() ? { playerId, status: "failed" } : null,
          );
        } finally {
          isPendingRef.current = false;
        }
      })();
    },
    [currentPlayerId, roomState],
  );

  return {
    actionState,
    handleTransferHost,
    isPending: actionState?.status === "pending" || actionState?.status === "retrying",
  };
}
