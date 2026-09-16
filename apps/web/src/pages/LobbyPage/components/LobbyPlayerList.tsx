import { type PublicPlayerState, type PublicRoomSettings } from "@tunetrack/shared";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbyPlayerListItem } from "./LobbyPlayerListItem";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../lobbyPageStyles";
import type { LobbyKickPlayerActionState } from "../LobbyPage.types";

interface LobbyPlayerListProps {
  currentPlayerId: string | null;
  isHost: boolean;
  isKickPlayerPending: boolean;
  kickPlayerActionState: LobbyKickPlayerActionState | null;
  players: PublicPlayerState[];
  roomSettings: PublicRoomSettings;
  onPlayerKick: (player: PublicPlayerState) => void;
  onPlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
  onPlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
}

export function LobbyPlayerList({
  currentPlayerId,
  isHost,
  isKickPlayerPending,
  kickPlayerActionState,
  players,
  roomSettings,
  onPlayerKick,
  onPlayerStartingCardCountChange,
  onPlayerStartingTtTokenCountChange,
}: LobbyPlayerListProps) {
  const { t } = useI18n();

  return (
    <SurfaceCard className={styles.rosterSection}>
      <LobbySectionHeader
        description={t("lobby.players.description")}
        title={t("lobby.players.title")}
      />

      <ul className={styles.playerList}>
        {players.map((player) => (
          <LobbyPlayerListItem
            currentPlayerId={currentPlayerId}
            isHost={isHost}
            isKickPlayerPending={isKickPlayerPending}
            kickPlayerActionState={kickPlayerActionState}
            onPlayerKick={onPlayerKick}
            key={player.id}
            onPlayerStartingCardCountChange={onPlayerStartingCardCountChange}
            onPlayerStartingTtTokenCountChange={onPlayerStartingTtTokenCountChange}
            player={player}
            roomSettings={roomSettings}
          />
        ))}
      </ul>
    </SurfaceCard>
  );
}
