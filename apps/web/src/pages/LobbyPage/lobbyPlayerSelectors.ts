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
  t,
}: {
  currentPlayerId: string | null;
  player: PublicPlayerState;
  roomSettings: PublicRoomSettings;
  t: (key: string, params?: Record<string, string | number>) => string;
}): LobbyPlayerDisplayState {
  const isCurrentPlayer = player.id === currentPlayerId;

  return {
    primaryName: isCurrentPlayer ? t("lobby.players.you") : player.displayName,
    startingCardsLabel: t("lobby.players.startingCards"),
    counterBadges: [
      {
        label: t("lobby.players.cards", {
          count: player.startingTimelineCardCount,
        }),
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
              label: t("lobby.players.host"),
              variant: "strong" as const,
            },
          ]
        : []),
    ],
  };
}
