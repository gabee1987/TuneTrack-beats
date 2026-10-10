import { m } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import {
  createMeasuredDisclosureMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../../../features/motion";
import styles from "../gamePageMenu.module.css";

interface GameMenuPlayerActionsProps {
  canKickPlayer: boolean;
  canTransferHost: boolean;
  hasTransferAction: boolean;
  isOpen: boolean;
  kickButtonLabel: string;
  onRequestKick: () => void;
  onRequestTransfer: () => void;
  transferButtonLabel: string;
}

/** The host's transfer and kick buttons, revealed to their measured height. */
export function GameMenuPlayerActions({
  canKickPlayer,
  canTransferHost,
  hasTransferAction,
  isOpen,
  kickButtonLabel,
  onRequestKick,
  onRequestTransfer,
  transferButtonLabel,
}: GameMenuPlayerActionsProps) {
  const reduceMotion = useReducedMotionPreference();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    const updateMeasuredHeight = () => {
      setContentHeight(contentElement.scrollHeight);
    };

    updateMeasuredHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateMeasuredHeight();
    });

    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <m.div
      animate={createMeasuredDisclosureMotion(reduceMotion, isOpen, contentHeight)}
      initial={false}
      style={{ overflow: "hidden", pointerEvents: isOpen ? "auto" : "none" }}
      transition={createStandardTransition(reduceMotion)}
    >
      <div className={styles.menuPlayerExpandedActions} ref={contentRef}>
        {hasTransferAction ? (
          <button
            className={`${styles.menuActionButton} ${styles.menuTransferHostButton}`}
            disabled={!canTransferHost}
            onClick={onRequestTransfer}
            type="button"
          >
            {transferButtonLabel}
          </button>
        ) : null}
        {canKickPlayer ? (
          <button
            className={`${styles.menuActionButton} ${styles.menuKickPlayerButton}`}
            onClick={onRequestKick}
            type="button"
          >
            {kickButtonLabel}
          </button>
        ) : null}
      </div>
    </m.div>
  );
}
