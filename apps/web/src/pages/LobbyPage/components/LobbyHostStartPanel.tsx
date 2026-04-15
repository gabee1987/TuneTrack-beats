import { ActionButton } from "../../../features/ui/ActionButton";
import styles from "../LobbyPage.module.css";

interface LobbyHostStartPanelProps {
  onIntentToStart: () => void;
  onStartGame: () => void;
}

export function LobbyHostStartPanel({
  onIntentToStart,
  onStartGame,
}: LobbyHostStartPanelProps) {
  return (
    <div className={styles.primaryActionBar}>
      <div>
        <h3 className={styles.primaryActionTitle}>Ready to play</h3>
        <p className={styles.primaryActionDescription}>
          Start when the room looks right.
        </p>
      </div>
      <ActionButton
        className={styles.startGameButton}
        onFocus={onIntentToStart}
        onClick={onStartGame}
        onMouseEnter={onIntentToStart}
        onTouchStart={onIntentToStart}
        type="button"
      >
        Start Game
      </ActionButton>
    </div>
  );
}
