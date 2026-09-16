import {
  ClientToServerEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { LobbyPlayerSettingsActionState } from "../LobbyPage.types";

interface UseLobbyPlayerSettingsActionOptions {
  isHost: boolean;
  roomState: PublicRoomState | null;
}

interface PlayerSettingsUpdate {
  playerId: string;
  startingTimelineCardCount: number;
  startingTtTokenCount: number;
}

export function useLobbyPlayerSettingsAction({
  isHost,
  roomState,
}: UseLobbyPlayerSettingsActionOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionState, setActionState] = useState<LobbyPlayerSettingsActionState | null>(null);

  const handlePlayerSettingsChange = useCallback(
    (update: PlayerSettingsUpdate) => {
      if (
        !roomState ||
        !isHost ||
        !roomState.players.some((player) => player.id === update.playerId) ||
        isPendingRef.current
      ) {
        return;
      }

      const submittedRoomId = roomState.roomId;
      const submittedHostId = roomState.hostId;
      function isSubmittedUpdateCurrent() {
        const currentRoomState = roomStateRef.current;
        const currentPlayer = currentRoomState?.players.find(
          (player) => player.id === update.playerId,
        );
        return (
          currentRoomState?.roomId === submittedRoomId &&
          currentRoomState.status === "lobby" &&
          currentRoomState.hostId === submittedHostId &&
          currentPlayer !== undefined &&
          (currentPlayer.startingTimelineCardCount !== update.startingTimelineCardCount ||
            currentPlayer.ttTokenCount !== update.startingTtTokenCount)
        );
      }

      isPendingRef.current = true;
      setActionState({ playerId: update.playerId, status: "pending" });
      void (async () => {
        try {
          const result = await emitAction(
            ClientToServerEvent.UpdatePlayerSettings,
            { roomId: submittedRoomId, ...update },
            {
              onTimeoutRetry: () => {
                if (isSubmittedUpdateCurrent()) {
                  setActionState({ playerId: update.playerId, status: "retrying" });
                }
              },
              retryOnTimeout: true,
            },
          );
          setActionState(
            result.status === "timeout" && isSubmittedUpdateCurrent()
              ? { playerId: update.playerId, status: "failed" }
              : null,
          );
        } catch {
          setActionState(
            isSubmittedUpdateCurrent()
              ? { playerId: update.playerId, status: "failed" }
              : null,
          );
        } finally {
          isPendingRef.current = false;
        }
      })();
    },
    [isHost, roomState],
  );

  return {
    actionState,
    handlePlayerSettingsChange,
    isPending: actionState?.status === "pending" || actionState?.status === "retrying",
  };
}
