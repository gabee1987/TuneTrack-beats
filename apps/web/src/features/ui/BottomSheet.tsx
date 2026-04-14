import type { MouseEventHandler, ReactNode } from "react";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
  overlayClassName?: string | undefined;
  sheetClassName?: string | undefined;
}

export function BottomSheet({
  children,
  onClose,
  overlayClassName,
  sheetClassName,
}: BottomSheetProps) {
  const stopPropagation: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`${styles.overlay}${overlayClassName ? ` ${overlayClassName}` : ""}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${styles.sheet}${sheetClassName ? ` ${sheetClassName}` : ""}`}
        onClick={stopPropagation}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
