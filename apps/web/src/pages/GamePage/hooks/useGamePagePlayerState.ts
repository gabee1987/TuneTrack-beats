import { type PublicRoomState } from "@tunetrack/shared";
import { useMemo } from "react";
import type { GamePagePlayerNameResolver } from "../GamePage.types";

interface UseGamePagePlayerStateOptions {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

interface UseGamePagePlayerStateResult {
  activePlayer: PublicRoomState["players"][number] | undefined;
  activePlayerTimeline: PublicRoomState["timelines"][string];
  challengeOwner: PublicRoomState["players"][number] | undefined;
  currentPlayer: PublicRoomState["players"][number] | undefined;
  currentPlayerTimeline: PublicRoomState["timelines"][string];
  getPlayerName: GamePagePlayerNameResolver;
  getPossessivePlayerName: GamePagePlayerNameResolver;
  showOwnTimeline: boolean;
}

export function useGamePagePlayerState({
  currentPlayerId,
  roomState,
}: UseGamePagePlayerStateOptions): UseGamePagePlayerStateResult {
  const activePlayer = roomState?.players.find(
    (player) => player.id === roomState.turn?.activePlayerId,
  );
  const currentPlayer = roomState?.players.find(
    (player) => player.id === currentPlayerId,
  );
  const challengeOwner = roomState?.players.find(
    (player) => player.id === roomState.challengeState?.challengerPlayerId,
  );

  const activePlayerTimeline = useMemo(() => {
    if (!roomState || !roomState.turn?.activePlayerId) {
      return [];
    }

    return roomState.timelines[roomState.turn.activePlayerId] ?? [];
  }, [roomState]);

  const currentPlayerTimeline = useMemo(() => {
    if (!roomState || !currentPlayerId) {
      return [];
    }

    return roomState.timelines[currentPlayerId] ?? [];
  }, [currentPlayerId, roomState]);

  const getPlayerName: GamePagePlayerNameResolver = (playerId) => {
    if (!playerId) {
      return "Unknown player";
    }

    if (playerId === currentPlayerId) {
      return "You";
    }

    return (
      roomState?.players.find((player) => player.id === playerId)?.displayName ??
      "Unknown player"
    );
  };

  const getPossessivePlayerName: GamePagePlayerNameResolver = (playerId) => {
    if (!playerId) {
      return "Unknown player's";
    }

    if (playerId === currentPlayerId) {
      return "Your";
    }

    return `${getPlayerName(playerId)}'s`;
  };

  return {
    activePlayer,
    activePlayerTimeline,
    challengeOwner,
    currentPlayer,
    currentPlayerTimeline,
    getPlayerName,
    getPossessivePlayerName,
    showOwnTimeline:
      Boolean(currentPlayerId) && currentPlayerId !== activePlayer?.id,
  };
}
