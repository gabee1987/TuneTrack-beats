import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { KickPlayerActionState } from "../GamePage.types";

interface UseKickPlayerActionOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function useKickPlayerAction({
  currentPlayerId,
  roomState,
}: UseKickPlayerActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionState, setActionState] = useState<KickPlayerActionState | null>(null);

  const handleKickPlayer = useCallback(
    (playerId: string) => {
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        playerId === currentPlayerId ||
        !roomState.players.some((player) => player.id === playerId) ||
        isPendingRef.current
      ) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      function isSubmittedRemovalCurrent() {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.hostId === submittedHostId &&
          currentRoomState.players.some((player) => player.id === playerId)
        );
      }

      isPendingRef.current = true;
      setActionState({ playerId, status: "pending" });
      void (async () => {
        try {
          const result = await emitAction(
            ClientToServerEvent.KickPlayer,
            { roomId: submittedRoomId, playerId },
            {
              onTimeoutRetry: () => {
                if (isSubmittedRemovalCurrent()) {
                  setActionState({ playerId, status: "retrying" });
                }
              },
              retryOnTimeout: true,
            },
          );
          setActionState(
            result.status === "timeout" && isSubmittedRemovalCurrent()
              ? { playerId, status: "failed" }
              : null,
          );
        } catch {
          setActionState(
            isSubmittedRemovalCurrent() ? { playerId, status: "failed" } : null,
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
    handleKickPlayer,
    isPending: actionState?.status === "pending" || actionState?.status === "retrying",
  };
}
