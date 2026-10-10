import type { Translate } from "../../../features/i18n";
import { Overlay } from "../../../features/overlay";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import styles from "../gamePageMenu.module.css";

interface PlayerConfirmDialogProps {
  body: string;
  closeLabel: string;
  confirmButtonClassName: string | undefined;
  confirmLabel: string;
  eyebrow: string;
  isConfirmDisabled: boolean;
  isOpen: boolean;
  label: string;
  onConfirm: () => void;
  onDismiss: () => void;
  t: Translate;
  title: string;
}

/** Confirms a host action against one player: transfer host or kick. */
export function PlayerConfirmDialog({
  body,
  closeLabel,
  confirmButtonClassName,
  confirmLabel,
  eyebrow,
  isConfirmDisabled,
  isOpen,
  label,
  onConfirm,
  onDismiss,
  t,
  title,
}: PlayerConfirmDialogProps) {
  return (
    <Overlay
      panelClassName={styles.transferConfirmCard}
      isOpen={isOpen}
      label={label}
      onDismiss={onDismiss}
      scrimClassName={styles.transferConfirmOverlay}
    >
      <div className={styles.transferConfirmHeaderRow}>
        <p className={styles.transferConfirmEyebrow}>{eyebrow}</p>
        <CloseIconButton
          ariaLabel={closeLabel}
          className={styles.transferConfirmCloseButton}
          onClick={onDismiss}
          size="sm"
        />
      </div>
      <h2 className={styles.transferConfirmTitle}>{title}</h2>
      <p className={styles.transferConfirmBody}>{body}</p>
      <div className={styles.transferConfirmActions}>
        <button
          className={`${styles.menuActionButton} ${styles.transferConfirmSecondaryButton}`}
          onClick={onDismiss}
          type="button"
        >
          {t("common.cancel")}
        </button>
        <button
          className={`${styles.menuActionButton} ${confirmButtonClassName}`}
          disabled={isConfirmDisabled}
          onClick={onConfirm}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  );
}
