import { ActionButton } from "../../../features/ui/ActionButton";
import { TextInput } from "../../../features/ui/TextInput";
import type { JoinRoomFormProps } from "../HomePage.types";
import styles from "../HomePage.module.css";

export function JoinRoomForm({
  displayName,
  roomId,
  onIntentToSubmit,
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
          <TextInput
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.textInput}
            inputMode="text"
            onChange={(event) => onRoomIdChange(event.target.value)}
            placeholder="party-room"
            type="text"
            value={roomId}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Player name</span>
          <TextInput
            className={styles.textInput}
            maxLength={24}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder="Player 1"
            type="text"
            value={displayName}
          />
        </label>

        <div className={styles.formFooter}>
          <p className={styles.formHint}>Your name stays saved on this device.</p>
          <ActionButton
            className={styles.primaryButton}
            onFocus={onIntentToSubmit}
            onMouseEnter={onIntentToSubmit}
            onTouchStart={onIntentToSubmit}
            type="submit"
          >
            Open Lobby
          </ActionButton>
        </div>
      </form>
    </section>
  );
}
