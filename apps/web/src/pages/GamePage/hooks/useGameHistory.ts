import type { PublicRoomState, TimelineCardPublic } from "@tunetrack/shared";
import { useMemo } from "react";

export interface GameHistoryEntry {
  card: TimelineCardPublic;
  playerId: string;
  playerDisplayName: string;
  wasCorrect: boolean;
}

export function useGameHistory(roomState: PublicRoomState | null): GameHistoryEntry[] {
  return useMemo(
    () =>
      roomState?.history.map((entry) => {
        const player = roomState.players.find((p) => p.id === entry.playerId);
        return {
          card: entry.placedCard,
          playerId: entry.playerId,
          playerDisplayName: player?.displayName ?? "Unknown",
          wasCorrect: entry.wasCorrect,
        };
      }) ?? [],
    [roomState],
  );
}
