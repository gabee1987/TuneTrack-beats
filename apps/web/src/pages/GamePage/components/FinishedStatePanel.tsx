import type { PublicRoomState } from "@tunetrack/shared";
import { useI18n } from "../../../features/i18n";
import type { GamePagePlayerNameResolver } from "../GamePage.types";
import styles from "./GamePageActionPanels.module.css";

interface FinishedStatePanelProps {
  currentPlayerId: string | null;
  getPlayerName: GamePagePlayerNameResolver;
  roomState: PublicRoomState;
  showHelperLabels: boolean;
}

export function FinishedStatePanel({
  currentPlayerId,
  getPlayerName,
  roomState,
  showHelperLabels,
}: FinishedStatePanelProps) {
  const { t } = useI18n();

  if (roomState.status !== "finished") {
    return null;
  }

  const didCurrentPlayerWin =
    Boolean(currentPlayerId) && roomState.winnerPlayerId === currentPlayerId;
  const titleText = didCurrentPlayerWin
    ? t("game.finished.youWon")
    : t("game.finished.playerWon", {
        playerName: getPlayerName(roomState.winnerPlayerId),
      });

  return (
    <section className={styles.revealPanel}>
      {showHelperLabels ? (
        <p className={styles.sectionLabel}>{t("game.finished.label")}</p>
      ) : null}
      <h2 className={styles.cardTitle}>{titleText}</h2>
    </section>
  );
}
