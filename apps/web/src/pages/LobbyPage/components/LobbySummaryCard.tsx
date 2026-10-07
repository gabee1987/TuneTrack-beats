import { Badge } from "../../../features/ui/Badge";
import { useI18n } from "../../../features/i18n";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import layoutStyles from "../lobbyLayout.module.css";
import settingsStyles from "../lobbySettings.module.css";

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
  const inviteUrl =
    typeof window === "undefined"
      ? `/join/${encodeURIComponent(roomId)}`
      : `${window.location.origin}/join/${encodeURIComponent(roomId)}`;

  function handleCopyInvite() {
    void navigator.clipboard?.writeText(inviteUrl);
  }

  return (
    <SurfaceCard className={layoutStyles.summaryCard}>
      <div className={layoutStyles.summaryRow}>
        <div>
          <p className={layoutStyles.summaryLabel}>{t("lobby.summary.joinedAs")}</p>
          <strong className={layoutStyles.summaryValue}>{displayName}</strong>
        </div>
        <Badge>{isHost ? t("lobby.summary.host") : t("lobby.summary.player")}</Badge>
      </div>

      <div className={layoutStyles.summaryGrid}>
        <div className={layoutStyles.summaryMetric}>
          <span className={layoutStyles.summaryLabel}>{t("lobby.summary.roomCode")}</span>
          <strong className={layoutStyles.summaryValue}>{roomId}</strong>
        </div>
        <div className={layoutStyles.summaryMetric}>
          <span className={layoutStyles.summaryLabel}>{t("lobby.summary.playersHere")}</span>
          <strong className={layoutStyles.summaryValue}>{playerCount}</strong>
        </div>
      </div>

      <button className={settingsStyles.copyInviteButton} onClick={handleCopyInvite} type="button">
        {t("lobby.summary.copyInvite")}
      </button>
    </SurfaceCard>
  );
}
