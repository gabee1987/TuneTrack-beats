import { useI18n } from "../../../../features/i18n";
import challengeStyles from "../gamePageActionPanelsChallenge.module.css";
import { useTurnSkipCountdown } from "./useTurnSkipCountdown";

interface OfflinePlayerPanelProps {
  playerName: string;
  turnSkipDeadlineEpochMs: number | null;
}

export function OfflinePlayerPanel({
  playerName,
  turnSkipDeadlineEpochMs,
}: OfflinePlayerPanelProps) {
  const { t } = useI18n();
  const turnSkipCountdown = useTurnSkipCountdown(turnSkipDeadlineEpochMs);

  return (
    <div className={challengeStyles.offlinePlayerPanel}>
      <div className={challengeStyles.offlinePlayerInfo}>
        <span className={challengeStyles.offlinePlayerLabel}>{t("game.controls.waitingFor")}</span>
        <span className={challengeStyles.offlinePlayerName}>{playerName}</span>
        <span className={challengeStyles.offlinePlayerStatus}>{t("gameMenu.offline")}</span>
      </div>
      {turnSkipCountdown ? (
        <span className={challengeStyles.offlinePlayerCountdown}>
          {t("game.controls.autoSkipIn", { time: turnSkipCountdown })}
        </span>
      ) : null}
    </div>
  );
}
