import { type PublicRoomState } from "@tunetrack/shared";
import { useMemo } from "react";
import { useI18n } from "../../../features/i18n";
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
  const { t } = useI18n();
  const activeTimelineOwnerId =
    roomState?.status === "finished"
      ? roomState.winnerPlayerId
      : roomState?.turn?.activePlayerId;
  const activePlayer = roomState?.players.find(
    (player) => player.id === activeTimelineOwnerId,
  );
  const currentPlayer = roomState?.players.find(
    (player) => player.id === currentPlayerId,
  );
  const challengeOwner = roomState?.players.find(
    (player) => player.id === roomState.challengeState?.challengerPlayerId,
  );

  const activePlayerTimeline = useMemo(() => {
    if (!roomState || !activeTimelineOwnerId) {
      return [];
    }

    return roomState.timelines[activeTimelineOwnerId] ?? [];
  }, [activeTimelineOwnerId, roomState]);

  const currentPlayerTimeline = useMemo(() => {
    if (!roomState || !currentPlayerId) {
      return [];
    }

    return roomState.timelines[currentPlayerId] ?? [];
  }, [currentPlayerId, roomState]);

  const getPlayerName: GamePagePlayerNameResolver = (playerId) => {
    if (!playerId) {
      return t("game.player.unknown");
    }

    if (playerId === currentPlayerId) {
      return t("game.player.you");
    }

    return (
      roomState?.players.find((player) => player.id === playerId)?.displayName ??
      t("game.player.unknown")
    );
  };

  const getPossessivePlayerName: GamePagePlayerNameResolver = (playerId) => {
    if (!playerId) {
      return t("game.player.unknownPossessive");
    }

    if (playerId === currentPlayerId) {
      return t("game.player.your");
    }

    return t("game.player.possessive", { playerName: getPlayerName(playerId) });
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
