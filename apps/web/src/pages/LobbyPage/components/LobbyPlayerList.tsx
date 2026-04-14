import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { LobbyRangeSettingField } from "./LobbyRangeSettingField";
import { LobbySectionHeader } from "./LobbySectionHeader";
import styles from "../LobbyPage.module.css";

interface LobbyPlayerListProps {
  currentPlayerId: string | null;
  isHost: boolean;
  players: PublicPlayerState[];
  roomSettings: PublicRoomSettings;
  onPlayerStartingCardCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
}

export function LobbyPlayerList({
  currentPlayerId,
  isHost,
  players,
  roomSettings,
  onPlayerStartingCardCountChange,
}: LobbyPlayerListProps) {
  return (
    <SurfaceCard className={styles.rosterSection}>
      <LobbySectionHeader
        description="Everyone currently in the room."
        title="Players"
      />

      <ul className={styles.playerList}>
        {players.map((player) => {
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <li className={styles.playerItem} key={player.id}>
              <div className={styles.playerInfoRow}>
                <div className={styles.playerIdentity}>
                  <strong className={styles.playerName}>
                    {isCurrentPlayer ? "You" : player.displayName}
                  </strong>
                  {!isCurrentPlayer ? (
                    <span className={styles.playerSecondaryName}>
                      {player.displayName}
                    </span>
                  ) : null}
                </div>

                <div className={styles.playerBadges}>
                  <span className={styles.inlineBadge}>
                    {player.startingTimelineCardCount} cards
                  </span>
                  {roomSettings.ttModeEnabled ? (
                    <span className={styles.inlineBadge}>{player.ttTokenCount} TT</span>
                  ) : null}
                  {player.isHost ? (
                    <span className={styles.inlineBadgeStrong}>Host</span>
                  ) : null}
                </div>
              </div>

              {isHost ? (
                <div className={styles.playerSettingField}>
                  <LobbyRangeSettingField
                    label={`Starting cards for ${
                      isCurrentPlayer ? "you" : player.displayName
                    }`}
                    max={MAX_STARTING_TIMELINE_CARD_COUNT}
                    min={MIN_STARTING_TIMELINE_CARD_COUNT}
                    onChange={(nextValue) =>
                      onPlayerStartingCardCountChange(player, nextValue)
                    }
                    value={player.startingTimelineCardCount}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
