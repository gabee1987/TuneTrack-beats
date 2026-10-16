import type { ReactNode } from "react";
import { useI18n } from "../../i18n";
import {
  createSideSheetMotion,
  createSideSheetScrimMotion,
  useReducedMotionPreference,
} from "../../motion";
import { Overlay } from "../../overlay";
import { PageHeader } from "./PageHeader";
import styles from "./Sheet.module.css";

export interface SheetProps {
  /** The body; deeper steps open inside it as `PanelView`s. */
  children: ReactNode;
  /** Floats over the body's end, above the home indicator: a selection bar or the main action. */
  dock?: ReactNode | undefined;
  /** Where the player is, over the title. */
  eyebrow: string;
  isOpen: boolean;
  onClose: () => void;
  onClosed?: (() => void) | undefined;
  /** The sheet's name and its heading. */
  title: string;
}

/**
 * The one sheet shell: the full screen on phones and a side sheet on wider screens. The
 * panel stays opaque and slides in; only the scrim fades (`createSideSheetMotion`). Back is
 * the one way out, as on every page (owner, 2026-10-16); a sheet's changes apply as made.
 */
export function Sheet({ children, dock, eyebrow, isOpen, onClose, onClosed, title }: SheetProps) {
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
      <div className={styles.header}>
        <PageHeader backLabel={t("common.back")} eyebrow={eyebrow} onBack={onClose} title={title} />
      </div>
      <div className={styles.body}>{children}</div>
      {dock ? <div className={styles.dock}>{dock}</div> : null}
    </Overlay>
  );
}
