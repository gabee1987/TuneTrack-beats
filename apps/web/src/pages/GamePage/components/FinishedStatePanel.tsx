import type { PublicRoomState } from "@tunetrack/shared";
import { useI18n } from "../../../features/i18n";
import styles from "./gamePageActionPanelsStyles";

interface FinishedStatePanelProps {
  currentPlayerId: string | null;
  showHelperLabels: boolean;
  status: PublicRoomState["status"];
  winnerPlayerId: string | null;
  winnerPlayerName: string;
}

export function FinishedStatePanel({
  currentPlayerId,
  showHelperLabels,
  status,
  winnerPlayerId,
  winnerPlayerName,
}: FinishedStatePanelProps) {
  const { t } = useI18n();

  if (status !== "finished") {
    return null;
  }

  const didCurrentPlayerWin = Boolean(currentPlayerId) && winnerPlayerId === currentPlayerId;
  const titleText = didCurrentPlayerWin
    ? t("game.finished.youWon")
    : t("game.finished.playerWon", { playerName: winnerPlayerName });

  return (
    <section className={styles.revealPanel}>
      {showHelperLabels ? <p className={styles.sectionLabel}>{t("game.finished.label")}</p> : null}
      <h2 className={styles.cardTitle}>{titleText}</h2>
    </section>
  );
}
