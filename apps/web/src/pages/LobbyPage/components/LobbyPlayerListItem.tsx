import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { Badge } from "../../../features/ui/Badge";
import { RangeField } from "../../../features/ui/RangeField";
import { TtTokenAmount } from "../../../features/ui/TtToken";
import { getLobbyPlayerDisplayState } from "../lobbyPlayerSelectors";
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
  const displayState = getLobbyPlayerDisplayState({
    currentPlayerId,
    player,
    roomSettings,
  });

  return (
    <li className={styles.playerItem}>
      <div className={styles.playerInfoRow}>
        <div className={styles.playerIdentity}>
          <strong className={styles.playerName}>{displayState.primaryName}</strong>
          {displayState.secondaryName ? (
            <span className={styles.playerSecondaryName}>
              {displayState.secondaryName}
            </span>
          ) : null}
        </div>

        <div className={styles.playerBadges}>
          {displayState.badges.map((badge) => {
            const tokenMatch = /^(\d+) TT$/.exec(badge.label);

            return (
              <Badge
                className={styles.playerBadge}
                key={badge.label}
                variant={badge.variant}
              >
                {tokenMatch ? (
                  <TtTokenAmount amount={Number(tokenMatch[1])} />
                ) : (
                  badge.label
                )}
              </Badge>
            );
          })}
        </div>
      </div>

      {isHost ? (
        <div className={styles.playerSettingField}>
          <RangeField
            density="compact"
            label={displayState.startingCardsLabel}
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
