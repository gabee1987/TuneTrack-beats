import type { ReactNode } from "react";
import { useI18n } from "../../i18n";
import {
  createSideSheetMotion,
  createSideSheetScrimMotion,
  useReducedMotionPreference,
} from "../../motion";
import { Overlay } from "../../overlay";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import styles from "./Sheet.module.css";

export interface SheetProps {
  /** The body; deeper steps open inside it as `PanelView`s. */
  children: ReactNode;
  /** Pinned under the body, above the home indicator: a selection bar or the main action. */
  dock?: ReactNode | undefined;
  isOpen: boolean;
  onClose: () => void;
  onClosed?: (() => void) | undefined;
  /**
   * For a sheet whose changes apply as they are made: Done replaces the close button, so there
   * is one way out (owner, 2026-10-15). Escape and Back still close it.
   */
  onDone?: (() => void) | undefined;
  title: string;
}

/**
 * The one sheet shell: the full screen on phones and a side sheet on wider screens. The
 * panel stays opaque and slides in; only the scrim fades (`createSideSheetMotion`).
 */
export function Sheet({ children, dock, isOpen, onClose, onClosed, onDone, title }: SheetProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotionPreference();

  return (
    <Overlay
      isOpen={isOpen}
      kind="sheet"
      label={title}
      layerClassName={styles.layer}
      onDismiss={onClose}
      panelClassName={styles.sheet}
      panelMotion={createSideSheetMotion(reduceMotion)}
      scrimClassName={styles.scrim}
      scrimMotion={createSideSheetScrimMotion(reduceMotion)}
      {...(onClosed ? { onClosed } : {})}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.headerActions}>
          {onDone ? (
            <Button onClick={onDone} variant="tertiary">
              {t("ui.sheet.done")}
            </Button>
          ) : (
            <IconButton aria-label={t("common.close")} onClick={onClose} variant="ghost">
              <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </IconButton>
          )}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
      {dock ? <div className={styles.dock}>{dock}</div> : null}
    </Overlay>
  );
}
