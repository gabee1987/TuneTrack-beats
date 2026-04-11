import type { PublicRoomState } from "@tunetrack/shared";
import styles from "./GamePageActionPanels.module.css";

interface FinishedStatePanelProps {
  getPlayerName: (playerId: string | null | undefined) => string;
  roomState: PublicRoomState;
  showHelperLabels: boolean;
}

export function FinishedStatePanel({
  getPlayerName,
  roomState,
  showHelperLabels,
}: FinishedStatePanelProps) {
  if (roomState.status !== "finished") {
    return null;
  }

  return (
    <section className={styles.revealPanel}>
      {showHelperLabels ? <p className={styles.sectionLabel}>Game Over</p> : null}
      <h2 className={styles.cardTitle}>
        {getPlayerName(roomState.winnerPlayerId)} wins!
      </h2>
    </section>
  );
}
