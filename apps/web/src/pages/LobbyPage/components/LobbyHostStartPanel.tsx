import styles from "../LobbyPage.module.css";

interface LobbyHostStartPanelProps {
  onStartGame: () => void;
}

export function LobbyHostStartPanel({
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
      <button className={styles.startGameButton} onClick={onStartGame} type="button">
        Start Game
      </button>
    </div>
  );
}
