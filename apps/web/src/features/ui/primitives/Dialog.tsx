import type { ReactNode } from "react";
import { classNames } from "../classNames";
import { IconButton } from "./IconButton";
import { Overlay } from "../../overlay";
import styles from "./Dialog.module.css";

export interface DialogProps {
  actions?: ReactNode | undefined;
  children: ReactNode;
  closeLabel?: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export function Dialog({
  actions,
  children,
  closeLabel = "Close",
  isOpen,
  onClose,
  title,
}: DialogProps) {
  return (
    <Overlay
      panelClassName={styles.card}
      isOpen={isOpen}
      label={title}
      onDismiss={onClose}
      scrimClassName={styles.overlay}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <IconButton aria-label={closeLabel} onClick={onClose} size="sm" variant="ghost">
          <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
        </IconButton>
      </div>
      <div className={styles.body}>{children}</div>
      {actions ? <div className={classNames(styles.actions)}>{actions}</div> : null}
    </Overlay>
  );
}
