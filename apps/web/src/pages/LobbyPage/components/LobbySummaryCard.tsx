import { Badge } from "../../../features/ui/Badge";
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
  return (
    <SurfaceCard className={styles.summaryCard}>
      <div className={styles.summaryRow}>
        <div>
          <p className={styles.summaryLabel}>Joined as</p>
          <strong className={styles.summaryValue}>{displayName}</strong>
        </div>
        <Badge>{isHost ? "Host" : "Player"}</Badge>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Room code</span>
          <strong className={styles.summaryValue}>{roomId}</strong>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Players here</span>
          <strong className={styles.summaryValue}>{playerCount}</strong>
        </div>
      </div>
    </SurfaceCard>
  );
}
