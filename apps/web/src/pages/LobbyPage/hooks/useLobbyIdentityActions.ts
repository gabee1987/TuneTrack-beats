import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import { useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import type { LobbyIdentityActionState } from "../LobbyPage.types";

interface UseLobbyIdentityActionsOptions {
  currentPlayerId: string | null;
  isHost: boolean;
  roomState: PublicRoomState | null;
}

export function useLobbyIdentityActions({
  currentPlayerId,
  isHost,
  roomState,
}: UseLobbyIdentityActionsOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isPendingRef = useRef(false);
  const [actionState, setActionState] = useState<LobbyIdentityActionState | null>(null);
  const isPending = actionState?.status === "pending" || actionState?.status === "retrying";

  async function handlePlayerProfileChange(displayName: string): Promise<boolean> {
    const currentPlayer = roomState?.players.find((player) => player.id === currentPlayerId);
    if (!roomState || roomState.status !== "lobby" || !currentPlayer || isPendingRef.current) {
      return false;
    }
    if (currentPlayer.displayName === displayName) {
      return true;
    }

    const submittedRoomId = roomState.roomId;
    const submittedPlayerId = currentPlayer.id;
    function hasAuthoritativeUpdateLanded() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.roomId === submittedRoomId &&
        currentRoomState.players.some(
          (player) => player.id === submittedPlayerId && player.displayName === displayName,
        )
      );
    }

    isPendingRef.current = true;
    setActionState({ kind: "profile", status: "pending" });
    try {
      const result = await emitAction(
        ClientToServerEvent.UpdatePlayerProfile,
        { displayName, roomId: submittedRoomId },
        {
          onTimeoutRetry: () => {
            if (!hasAuthoritativeUpdateLanded()) {
              setActionState({ kind: "profile", status: "retrying" });
            }
          },
          retryOnTimeout: true,
        },
      );
      const didSucceed = result.status === "ok" || hasAuthoritativeUpdateLanded();
      setActionState(
        result.status === "timeout" && !didSucceed ? { kind: "profile", status: "failed" } : null,
      );
      return didSucceed;
    } catch {
      if (hasAuthoritativeUpdateLanded()) {
        setActionState(null);
        return true;
      }
      setActionState({ kind: "profile", status: "failed" });
      return false;
    } finally {
      isPendingRef.current = false;
    }
  }

  async function handleRoomRename(nextRoomId: string): Promise<boolean> {
    if (!roomState || roomState.status !== "lobby" || !isHost || isPendingRef.current) {
      return false;
    }
    if (roomState.roomId === nextRoomId) {
      return true;
    }

    const submittedRoomId = roomState.roomId;
    const submittedHostId = roomState.hostId;
    function hasAuthoritativeRenameLanded() {
      const currentRoomState = roomStateRef.current;
      return currentRoomState?.roomId === nextRoomId && currentRoomState.hostId === submittedHostId;
    }

    isPendingRef.current = true;
    setActionState({ kind: "rename", status: "pending" });
    try {
      const result = await emitAction(
        ClientToServerEvent.RenameRoom,
        { nextRoomId, roomId: submittedRoomId },
        {
          onTimeoutRetry: () => {
            if (!hasAuthoritativeRenameLanded()) {
              setActionState({ kind: "rename", status: "retrying" });
            }
          },
          retryOnTimeout: true,
        },
      );
      const didSucceed = result.status === "ok" || hasAuthoritativeRenameLanded();
      setActionState(
        result.status === "timeout" && !didSucceed ? { kind: "rename", status: "failed" } : null,
      );
      return didSucceed;
    } catch {
      if (hasAuthoritativeRenameLanded()) {
        setActionState(null);
        return true;
      }
      setActionState({ kind: "rename", status: "failed" });
      return false;
    } finally {
      isPendingRef.current = false;
    }
  }

  return {
    actionState,
    handlePlayerProfileChange,
    handleRoomRename,
    isPending,
  };
}
