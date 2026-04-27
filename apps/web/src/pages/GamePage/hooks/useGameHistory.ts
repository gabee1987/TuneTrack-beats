import type { PublicRoomState, TimelineCardPublic } from "@tunetrack/shared";
import { useEffect, useRef, useState } from "react";

export interface GameHistoryEntry {
  card: TimelineCardPublic;
  playerId: string;
  playerDisplayName: string;
  wasCorrect: boolean;
}

export function useGameHistory(roomState: PublicRoomState | null): GameHistoryEntry[] {
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const lastSeenCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    const revealState = roomState?.revealState;
    if (!revealState) return;

    const cardId = revealState.placedCard.id;
    if (cardId === lastSeenCardIdRef.current) return;
    lastSeenCardIdRef.current = cardId;

    const player = roomState.players.find((p) => p.id === revealState.playerId);
    setEntries((prev) => [
      ...prev,
      {
        card: revealState.placedCard,
        playerId: revealState.playerId,
        playerDisplayName: player?.displayName ?? "Unknown",
        wasCorrect: revealState.wasCorrect,
      },
    ]);
  }, [roomState]);

  return entries;
}
