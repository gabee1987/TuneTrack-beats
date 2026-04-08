import styles from "../LobbyPage.module.css";

interface LobbyRoomActionsProps {
  onCloseRoom: () => void;
}

export function LobbyRoomActions({ onCloseRoom }: LobbyRoomActionsProps) {
  return (
    <section className={styles.roomActionsSection}>
      <div>
        <h2 className={styles.sectionTitle}>Room actions</h2>
        <p className={styles.sectionDescription}>
          Closing the room sends everyone back to the main menu.
        </p>
      </div>
      <button className={styles.cancelRoomButton} onClick={onCloseRoom} type="button">
        Close Room
      </button>
    </section>
  );
}
