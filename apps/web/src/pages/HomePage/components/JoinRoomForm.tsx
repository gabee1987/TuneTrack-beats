import { FormEvent } from "react";
import styles from "../HomePage.module.css";

interface JoinRoomFormProps {
  displayName: string;
  roomId: string;
  onDisplayNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function JoinRoomForm({
  displayName,
  roomId,
  onDisplayNameChange,
  onRoomIdChange,
  onSubmit,
}: JoinRoomFormProps) {
  return (
    <section className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div>
          <h2 className={styles.formTitle}>Join a game room</h2>
          <p className={styles.formDescription}>
            Enter the code and the name other players will see.
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Room code</span>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.input}
            inputMode="text"
            onChange={(event) => onRoomIdChange(event.target.value)}
            placeholder="party-room"
            type="text"
            value={roomId}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Player name</span>
          <input
            className={styles.input}
            maxLength={24}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder="Player 1"
            type="text"
            value={displayName}
          />
        </label>

        <div className={styles.formFooter}>
          <p className={styles.formHint}>Your name stays saved on this device.</p>
          <button className={styles.primaryButton} type="submit">
            Open Lobby
          </button>
        </div>
      </form>
    </section>
  );
}
