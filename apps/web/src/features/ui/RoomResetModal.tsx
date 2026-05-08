import { useI18n } from "../i18n";
import { MotionDialogPortal } from "../motion";
import { ActionButton } from "./ActionButton";
import styles from "./RoomResetModal.module.css";

interface RoomResetModalProps {
  isOpen: boolean;
  onReset: () => void;
}

export function RoomResetModal({ isOpen, onReset }: RoomResetModalProps) {
  const { t } = useI18n();

  return (
    <MotionDialogPortal
      cardClassName={styles.card}
      isOpen={isOpen}
      label={t("roomReset.title")}
      onClose={onReset}
      overlayClassName={styles.overlay}
    >
      <p className={styles.eyebrow}>{t("roomReset.eyebrow")}</p>
      <h2 className={styles.title}>{t("roomReset.title")}</h2>
      <p className={styles.body}>{t("roomReset.body")}</p>
      <ActionButton className={styles.action} onClick={onReset} type="button">
        {t("roomReset.action")}
      </ActionButton>
    </MotionDialogPortal>
  );
}
