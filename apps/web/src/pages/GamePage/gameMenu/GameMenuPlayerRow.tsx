import type { PublicPlayerState } from "@tunetrack/shared/client";
import type { Translate } from "../../../features/i18n";
import { Badge } from "../../../features/ui/Badge";
import { CardCountAmount } from "../../../features/ui/CardCountAmount";
import { TokenCountAmount } from "../../../features/ui/TokenCountAmount";
import styles from "../gamePageMenu.module.css";

interface GameMenuPlayerRowProps {
  canExpand: boolean;
  cardCount: number;
  isActiveTurnPlayer: boolean;
  isCurrentPlayer: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  player: PublicPlayerState;
  t: Translate;
  ttModeEnabled: boolean;
}

/** The player's name and status badges; the whole row toggles the host controls. */
export function GameMenuPlayerRow({
  canExpand,
  cardCount,
  isActiveTurnPlayer,
  isCurrentPlayer,
  isExpanded,
  onToggleExpanded,
  player,
  t,
  ttModeEnabled,
}: GameMenuPlayerRowProps) {
  return (
    <button
      aria-expanded={isExpanded}
      className={styles.menuPlayerExpandButton}
      disabled={!canExpand}
      onClick={() => {
        if (canExpand) onToggleExpanded();
      }}
      type="button"
    >
      <div className={styles.menuPlayerInfoRow}>
        <div className={styles.menuPlayerIdentity}>
          <div className={styles.menuPlayerNameRow}>
            <strong className={styles.menuPlayerName}>
              {isCurrentPlayer ? t("common.you") : player.displayName}
            </strong>
            <div className={styles.menuPlayerBadges}>
              <Badge className={styles.menuPlayerBadge} size="sm" variant="neutral">
                <CardCountAmount
                  amount={cardCount}
                  ariaLabel={t("gameMenu.cards", { count: cardCount })}
                  className={styles.menuPlayerCardCount}
                />
              </Badge>
              {ttModeEnabled ? (
                <Badge className={styles.menuPlayerBadge} size="sm" variant="neutral">
                  <TokenCountAmount amount={player.ttTokenCount} />
                </Badge>
              ) : null}
              {player.isHost ? (
                <Badge className={styles.menuPlayerBadge} size="sm" variant="strong">
                  {t("gameMenu.host")}
                </Badge>
              ) : null}
              {player.connectionStatus === "disconnected" ? (
                <Badge className={styles.menuPlayerBadge} size="sm" variant="mutedSurface">
                  {t("gameMenu.offline")}
                </Badge>
              ) : null}
              {isActiveTurnPlayer ? (
                <Badge className={styles.menuPlayerBadge} size="sm" variant="mutedSurface">
                  {t("gameMenu.turn")}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
