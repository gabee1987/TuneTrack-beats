import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
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
  onPlayerStartingTtTokenCountChange: (
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
  onPlayerStartingTtTokenCountChange,
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
          <div className={styles.playerNameRow}>
            <strong className={styles.playerName}>{displayState.primaryName}</strong>
            <div className={styles.playerCounterBadges}>
              {displayState.counterBadges.map((badge) => {
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
          {roomSettings.ttModeEnabled ? (
            <RangeField
              density="compact"
              label="Starting tokens"
              max={MAX_STARTING_TT_TOKEN_COUNT}
              min={MIN_STARTING_TT_TOKEN_COUNT}
              onChange={(nextValue) =>
                onPlayerStartingTtTokenCountChange(player, nextValue)
              }
              value={player.ttTokenCount}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
