import { useState } from "react";
import { useI18n } from "../i18n";
import { Overlay } from "../overlay";
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
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isOpen && isLeaving) {
    setIsLeaving(false);
  }

  return (
    // The room is gone: Escape and the scrim do nothing; Back and the action both reset
    // (owner decision 2026-10-08). The action first pops the dialog's history entry, so the
    // reset's replace navigation lands on the room entry and leaves nothing behind Home.
    <Overlay
      dismissible={false}
      isOpen={isOpen && !isLeaving}
      kind="blocking"
      label={t(copyKeys.title)}
      onBack={onReset}
      onClosed={() => {
        if (isLeaving) {
          onReset();
        }
      }}
      onDismiss={onReset}
      panelClassName={styles.card}
      scrimClassName={styles.overlay}
    >
      <p className={styles.eyebrow}>{t(copyKeys.eyebrow)}</p>
      <h2 className={styles.title}>{t(copyKeys.title)}</h2>
      <p className={styles.body}>{t(copyKeys.body)}</p>
      <ActionButton className={styles.action} onClick={() => setIsLeaving(true)} type="button">
        {t("roomReset.action")}
      </ActionButton>
    </Overlay>
  );
}
