import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { Badge } from "../../../features/ui/Badge";
import { RangeField } from "../../../features/ui/RangeField";
import styles from "../LobbyPage.module.css";

interface LobbyPlayerListItemProps {
  currentPlayerId: string | null;
  isHost: boolean;
  onPlayerStartingCardCountChange: (
    player: PublicPlayerState,
    nextValue: number,
  ) => void;
  player: PublicPlayerState;
  roomSettings: PublicRoomSettings;
}

export function LobbyPlayerListItem({
  currentPlayerId,
  isHost,
  onPlayerStartingCardCountChange,
  player,
  roomSettings,
}: LobbyPlayerListItemProps) {
  const isCurrentPlayer = player.id === currentPlayerId;

  return (
    <li className={styles.playerItem}>
      <div className={styles.playerInfoRow}>
        <div className={styles.playerIdentity}>
          <strong className={styles.playerName}>
            {isCurrentPlayer ? "You" : player.displayName}
          </strong>
          {!isCurrentPlayer ? (
            <span className={styles.playerSecondaryName}>{player.displayName}</span>
          ) : null}
        </div>

        <div className={styles.playerBadges}>
          <Badge>{player.startingTimelineCardCount} cards</Badge>
          {roomSettings.ttModeEnabled ? <Badge>{player.ttTokenCount} TT</Badge> : null}
          {player.isHost ? <Badge variant="strong">Host</Badge> : null}
        </div>
      </div>

      {isHost ? (
        <div className={styles.playerSettingField}>
          <RangeField
            label={`Starting cards for ${isCurrentPlayer ? "you" : player.displayName}`}
            max={MAX_STARTING_TIMELINE_CARD_COUNT}
            min={MIN_STARTING_TIMELINE_CARD_COUNT}
            onChange={(nextValue) => onPlayerStartingCardCountChange(player, nextValue)}
            value={player.startingTimelineCardCount}
          />
        </div>
      ) : null}
    </li>
  );
}
