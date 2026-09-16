import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicPlayerState,
  type PublicRoomSettings,
} from "@tunetrack/shared";
import { Badge } from "../../../features/ui/Badge";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { useI18n } from "../../../features/i18n";
import { RangeField } from "../../../features/ui/RangeField";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import { getLobbyPlayerDisplayState } from "../lobbyPlayerSelectors";
import styles from "../lobbyPageStyles";
import type { LobbyKickPlayerActionState } from "../LobbyPage.types";

interface LobbyPlayerListItemProps {
  currentPlayerId: string | null;
  isHost: boolean;
  isKickPlayerPending: boolean;
  kickPlayerActionState: LobbyKickPlayerActionState | null;
  onPlayerKick: (player: PublicPlayerState) => void;
  onPlayerStartingCardCountChange: (player: PublicPlayerState, nextValue: number) => void;
  onPlayerStartingTtTokenCountChange: (player: PublicPlayerState, nextValue: number) => void;
  player: PublicPlayerState;
  roomSettings: PublicRoomSettings;
}

export function LobbyPlayerListItem({
  currentPlayerId,
  isHost,
  isKickPlayerPending,
  kickPlayerActionState,
  onPlayerKick,
  onPlayerStartingCardCountChange,
  onPlayerStartingTtTokenCountChange,
  player,
  roomSettings,
}: LobbyPlayerListItemProps) {
  const { t } = useI18n();
  const displayState = getLobbyPlayerDisplayState({
    currentPlayerId,
    player,
    roomSettings,
    t,
  });
  const canKickPlayer = isHost && player.id !== currentPlayerId;
  const kickActionStatus =
    kickPlayerActionState?.playerId === player.id ? kickPlayerActionState.status : null;
  const kickButtonLabel =
    kickActionStatus === "retrying"
      ? t("lobby.players.kickRetrying")
      : kickActionStatus === "failed"
        ? t("lobby.players.retryKick")
        : t("lobby.players.kick");
  const kickButtonAriaLabel =
    kickActionStatus === "retrying" || kickActionStatus === "failed"
      ? kickButtonLabel
      : t("lobby.players.kickPlayer", { playerName: displayState.primaryName });

  return (
    <li className={styles.playerItem}>
      <div className={styles.playerInfoRow}>
        <div className={styles.playerIdentity}>
          <div className={styles.playerNameRow}>
            <strong className={styles.playerName}>{displayState.primaryName}</strong>
            <div className={styles.playerCounterBadges}>
              {displayState.counterBadges.map((badge) => {
                return (
                  <Badge className={styles.playerBadge} key={badge.label} variant={badge.variant}>
                    {badge.kind === "cardCount" && badge.count !== undefined ? (
                      <CardCountAmount
                        amount={badge.count}
                        ariaLabel={badge.label}
                        className={styles.playerCardCount}
                      />
                    ) : badge.kind === "tokenCount" && badge.count !== undefined ? (
                      <TokenCountAmount amount={badge.count} />
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
              label={t("lobby.players.startingTokens")}
              max={MAX_STARTING_TT_TOKEN_COUNT}
              min={MIN_STARTING_TT_TOKEN_COUNT}
              onChange={(nextValue) => onPlayerStartingTtTokenCountChange(player, nextValue)}
              value={player.ttTokenCount}
            />
          ) : null}
        </div>
      ) : null}

      {canKickPlayer ? (
        <div className={styles.playerActionRow}>
          <button
            aria-label={kickButtonAriaLabel}
            className={styles.playerKickButton}
            disabled={isKickPlayerPending}
            onClick={() => onPlayerKick(player)}
            type="button"
          >
            {kickButtonLabel}
          </button>
        </div>
      ) : null}
    </li>
  );
}
