import { useI18n } from "../../../features/i18n";
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
  const { t } = useI18n();

  return (
    <section className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div>
          <h2 className={styles.formTitle}>{t("home.joinRoomTitle")}</h2>
          <p className={styles.formDescription}>{t("home.joinRoomDescription")}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("home.roomCodeLabel")}</span>
          <TextInput
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.textInput}
            inputMode="text"
            onChange={(event) => onRoomIdChange(event.target.value)}
            placeholder={t("home.roomCodePlaceholder")}
            type="text"
            value={roomId}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("home.playerNameLabel")}</span>
          <TextInput
            className={styles.textInput}
            maxLength={24}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder={t("home.playerNamePlaceholder")}
            type="text"
            value={displayName}
          />
        </label>

        <div className={styles.formFooter}>
          <p className={styles.formHint}>{t("home.savedNameHint")}</p>
          <ActionButton
            className={styles.primaryButton}
            onFocus={onIntentToSubmit}
            onMouseEnter={onIntentToSubmit}
            onTouchStart={onIntentToSubmit}
            type="submit"
          >
            {t("home.openLobby")}
          </ActionButton>
        </div>
      </form>
    </section>
  );
}
