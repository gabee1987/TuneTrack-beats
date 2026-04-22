import type { PublicPlayerState, PublicRoomSettings } from "@tunetrack/shared";

export interface LobbyPlayerBadgeSpec {
  label: string;
  variant: "neutral" | "strong";
}

export interface LobbyPlayerDisplayState {
  counterBadges: LobbyPlayerBadgeSpec[];
  primaryName: string;
  startingCardsLabel: string;
}

export function getLobbyPlayerDisplayState({
  currentPlayerId,
  player,
  roomSettings,
}: {
  currentPlayerId: string | null;
  player: PublicPlayerState;
  roomSettings: PublicRoomSettings;
}): LobbyPlayerDisplayState {
  const isCurrentPlayer = player.id === currentPlayerId;

  return {
    primaryName: isCurrentPlayer ? "You" : player.displayName,
    startingCardsLabel: "Starting cards",
    counterBadges: [
      {
        label: `${player.startingTimelineCardCount} cards`,
        variant: "neutral",
      },
      ...(roomSettings.ttModeEnabled
        ? [
            {
              label: `${player.ttTokenCount} TT`,
              variant: "neutral" as const,
            },
          ]
        : []),
      ...(player.isHost
        ? [
            {
              label: "Host",
              variant: "strong" as const,
            },
          ]
        : []),
    ],
  };
}
