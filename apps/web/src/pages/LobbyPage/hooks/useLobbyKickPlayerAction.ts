import {
  ClientToServerEvent,
  type PublicPlayerState,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { LobbyKickPlayerActionState } from "../LobbyPage.types";

interface UseLobbyKickPlayerActionOptions {
  isHost: boolean;
  roomState: PublicRoomState | null;
}

export function useLobbyKickPlayerAction({ isHost, roomState }: UseLobbyKickPlayerActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionState, setActionState] = useState<LobbyKickPlayerActionState | null>(null);

  const handlePlayerKick = useCallback(
    (player: PublicPlayerState) => {
      if (
        !roomState ||
        !isHost ||
        player.id === roomState.hostId ||
        !roomState.players.some((roomPlayer) => roomPlayer.id === player.id) ||
        isPendingRef.current
      ) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      const playerId = player.id;
      function isSubmittedRemovalCurrent() {
        const currentRoomState = roomStateRef.current;
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.status === "lobby" &&
          currentRoomState.hostId === submittedHostId &&
          currentRoomState.players.some((roomPlayer) => roomPlayer.id === playerId)
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
          setActionState(isSubmittedRemovalCurrent() ? { playerId, status: "failed" } : null);
        } finally {
          isPendingRef.current = false;
        }
      })();
    },
    [isHost, roomState],
  );

  return {
    actionState,
    handlePlayerKick,
    isPending: actionState?.status === "pending" || actionState?.status === "retrying",
  };
}
