import { type PublicPlayerState, type PublicRoomSettings } from "@tunetrack/shared";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbyPlayerListItem } from "./LobbyPlayerListItem";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

interface LobbyPlayerListProps {
  currentPlayerId: string | null;
  isHost: boolean;
  players: PublicPlayerState[];
  roomSettings: PublicRoomSettings;
  onPlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
  onPlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
}

export function LobbyPlayerList({
  currentPlayerId,
  isHost,
  players,
  roomSettings,
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
