import { useI18n } from "../i18n";
import { MotionDialogPortal } from "../motion";
import { ActionButton } from "./ActionButton";
import styles from "./RoomResetModal.module.css";

export type ClosedRoomReason = "closed" | "server_restarted";

interface RoomResetModalProps {
  isOpen: boolean;
  onReset: () => void;
  reason: ClosedRoomReason;
}

const COPY_KEYS_BY_REASON: Record<
  ClosedRoomReason,
  { eyebrow: string; title: string; body: string }
> = {
  closed: {
    eyebrow: "roomReset.eyebrow",
    title: "roomReset.title",
    body: "roomReset.body",
  },
  server_restarted: {
    eyebrow: "roomReset.serverRestarted.eyebrow",
    title: "roomReset.serverRestarted.title",
    body: "roomReset.serverRestarted.body",
  },
};

export function RoomResetModal({ isOpen, onReset, reason }: RoomResetModalProps) {
  const { t } = useI18n();
  const copyKeys = COPY_KEYS_BY_REASON[reason];

  return (
    <MotionDialogPortal
      cardClassName={styles.card}
      isOpen={isOpen}
      label={t(copyKeys.title)}
      onClose={onReset}
      overlayClassName={styles.overlay}
    >
      <p className={styles.eyebrow}>{t(copyKeys.eyebrow)}</p>
      <h2 className={styles.title}>{t(copyKeys.title)}</h2>
      <p className={styles.body}>{t(copyKeys.body)}</p>
      <ActionButton className={styles.action} onClick={onReset} type="button">
        {t("roomReset.action")}
      </ActionButton>
    </MotionDialogPortal>
  );
}
