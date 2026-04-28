import { Badge } from "../../../features/ui/Badge";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import styles from "../LobbyPage.module.css";

interface LobbySummaryCardProps {
  displayName: string;
  isHost: boolean;
  playerCount: number;
  roomId: string;
}

export function LobbySummaryCard({
  displayName,
  isHost,
  playerCount,
  roomId,
}: LobbySummaryCardProps) {
  const { t } = useI18n();

  return (
    <SurfaceCard className={styles.summaryCard}>
      <div className={styles.summaryRow}>
        <div>
          <p className={styles.summaryLabel}>{t("lobby.summary.joinedAs")}</p>
          <strong className={styles.summaryValue}>{displayName}</strong>
        </div>
        <Badge>{isHost ? t("lobby.summary.host") : t("lobby.summary.player")}</Badge>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>{t("lobby.summary.roomCode")}</span>
          <strong className={styles.summaryValue}>{roomId}</strong>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>{t("lobby.summary.playersHere")}</span>
          <strong className={styles.summaryValue}>{playerCount}</strong>
        </div>
      </div>
    </SurfaceCard>
  );
}
