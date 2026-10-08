import type { ReactNode } from "react";
import { createBottomSheetMotion, useReducedMotionPreference } from "../motion";
import { Overlay } from "../overlay";
import { classNames } from "./classNames";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  label: string;
  onClose: () => void;
  overlayClassName?: string | undefined;
  sheetClassName?: string | undefined;
  showHandle?: boolean | undefined;
}

export function BottomSheet({
  children,
  isOpen,
  label,
  onClose,
  overlayClassName,
  sheetClassName,
  showHandle = true,
}: BottomSheetProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <Overlay
      isOpen={isOpen}
      kind="sheet"
      label={label}
      onDismiss={onClose}
      panelClassName={classNames(styles.sheet, sheetClassName)}
      panelMotion={createBottomSheetMotion(reduceMotion)}
      scrimClassName={classNames(styles.overlay, overlayClassName)}
    >
      {showHandle ? (
        <div className={styles.handleRow} aria-hidden="true">
          <div className={styles.handle} />
        </div>
      ) : null}
      <div className={styles.content}>{children}</div>
    </Overlay>
  );
}
