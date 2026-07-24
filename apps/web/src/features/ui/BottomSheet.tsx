import type { MouseEventHandler, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  createBottomSheetMotion,
  createFadeMotion,
  createStandardTransition,
  useReducedMotionPreference,
} from "../motion";
import { classNames } from "./classNames";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
  overlayClassName?: string | undefined;
  sheetClassName?: string | undefined;
  showHandle?: boolean | undefined;
}

export function BottomSheet({
  children,
  onClose,
  overlayClassName,
  sheetClassName,
  showHandle = true,
}: BottomSheetProps) {
  const reduceMotion = useReducedMotionPreference();
  const stopPropagation: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  return (
    <motion.div
      animate="animate"
      className={classNames(styles.overlay, overlayClassName)}
      exit="exit"
      initial="initial"
      onClick={onClose}
      role="presentation"
      transition={createStandardTransition(reduceMotion)}
      variants={createFadeMotion(reduceMotion)}
    >
      <motion.div
        animate="animate"
        className={classNames(styles.sheet, sheetClassName)}
        exit="exit"
        initial="initial"
        onClick={stopPropagation}
        role="dialog"
        transition={createStandardTransition(reduceMotion)}
        variants={createBottomSheetMotion(reduceMotion)}
      >
        {showHandle ? (
          <div className={styles.handleRow} aria-hidden="true">
            <div className={styles.handle} />
          </div>
        ) : null}
        <div className={styles.content}>{children}</div>
      </motion.div>
    </motion.div>
  );
}
